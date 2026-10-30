import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const port = Number(process.env.PORT || 10000);

// 1. ORIGINES AUTORISÉES
const envOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const defaultOrigins = [
  'https://nouvelletechnologie.github.io/digicom-togo-Admin/',
  'https://digicom-togo-admin.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

// 2. UN SEUL CORS, BIEN CONFIGURÉ
app.use(cors({
  origin: function(origin, callback) {
    // autorise les requêtes sans origin (comme Postman) et celles de ta liste
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origine non autorisée: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 3. Gère le preflight pour les requêtes avec Authorization
app.options('*', cors());

// 4. LIMITE POUR LES PHOTOS BASE64 - 25MB
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'digicom-ai', configured: Boolean(client), allowedOrigins });
});

app.post('/api/generate-description', async (req, res) => {
  try {
    if (!client) return res.status(503).json({ error: 'Le service IA n’est pas configuré côté serveur.' });
    const { nom, prix, categorie, details } = req.body || {};
    if (typeof nom !== 'string' || nom.trim().length < 2 || nom.trim().length > 120)
      return res.status(400).json({ error: 'Le nom du produit doit contenir de 2 à 120 caractères.' });
    if (details != null && (typeof details !== 'string' || details.length > 1200))
      return res.status(400).json({ error: 'Les détails sont trop longs (maximum 1 200 caractères).' });

    const result = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: 'Rédige en français une description de produit pour une marketplace locale au Togo, environ 40 à 90 mots. Sois clair et attractif sans inventer de marque, qualité certifiée, origine, garantie, ingrédients, dimensions, stock, propriétés médicales ou caractéristiques non fournies. Ne modifie pas le prix. Retourne uniquement la description.',
      input: `Nom : ${nom.trim()}\nPrix indiqué : ${String(prix ?? 'non précisé').slice(0, 40)}\nCatégorie : ${String(categorie ?? 'non précisée').slice(0, 100)}\nDétails confirmés : ${String(details ?? 'aucun').slice(0, 1200)}`
    });
    const description = (result.output_text || '').trim();
    if (!description) return res.status(502).json({ error: 'Aucune description retournée. Réessayez.' });
    return res.json({ description });
  } catch (e) {
    console.error('generate-description:', e?.message || e);
    return res.status(500).json({ error: 'Erreur lors de la génération de la description.' });
  }
});

app.post('/api/improve-image', async (req, res) => {
  try {
    if (!client) return res.status(503).json({ error: 'Le service IA n’est pas configuré côté serveur.' });
    const { imageDataUrl, prompt } = req.body || {};
    if (typeof imageDataUrl !== 'string' || !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageDataUrl))
      return res.status(400).json({ error: 'Envoyez une image PNG, JPEG ou WebP valide.' });
    if (imageDataUrl.length > 20 * 1024 * 1024)
      return res.status(413).json({ error: 'Image trop volumineuse. Choisissez une photo de moins de 12 Mo.' });

    const imageFile = await dataUrlToFile(imageDataUrl);

    const imageResponse = await client.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: (typeof prompt === 'string' && prompt.trim() ? prompt.trim() : 'Améliorer la lumière et la netteté de la photo du produit. Préserver le produit réel, sa forme, sa couleur, ses logos et détails. Ne rien ajouter ni retirer.').slice(0, 700),
      size: '1024x1024'
    });
    const b64 = imageResponse.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: 'Aucune image améliorée retournée.' });
    return res.json({ imageDataUrl: `data:image/png;base64,${b64}` });
  } catch (e) {
    console.error('improve-image:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'Impossible d’améliorer la photo.' });
  }
});

async function dataUrlToFile(dataUrl) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([\s\S]+)$/i);
  if (!match) throw new Error('Format image invalide');
  const mime = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
  const bytes = Buffer.from(match[2], 'base64');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  // Node 20+ supporte File global
  return new File([bytes], `product.${ext}`, { type: mime });
}
app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.listen(port, () => console.log(`DigiCom AI écoute sur le port ${port}`));
