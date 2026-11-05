import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const port = Number(process.env.PORT || 10000);
const normalizeOrigin = (value) => { try { return new URL(value.trim()).origin; } catch { return ''; } };
const configuredOrigins = (process.env.FRONTEND_ORIGIN || 'https://nouvelletechnologie.github.io')
  .split(',').map(normalizeOrigin).filter(Boolean);
const allowedOrigins = [...new Set(configuredOrigins)];
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) return callback(null, true);
    return callback(new Error(`Origine non autorisée par CORS : ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '25mb' }));

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
app.get('/', (_req, res) => res.json({ service: 'digicom-ai', status: 'online', health: '/api/health' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'digicom-ai', configured: Boolean(client) }));

app.post('/api/generate-description', async (req, res) => {
  try {
    if (!client) return res.status(503).json({ error: 'Service IA non configuré : OPENAI_API_KEY manquante.' });
    const { nom, prix, categorie, details } = req.body || {};
    if (typeof nom !== 'string' || nom.trim().length < 2 || nom.trim().length > 120) return res.status(400).json({ error: 'Le nom du produit doit contenir de 2 à 120 caractères.' });
    if (details != null && (typeof details !== 'string' || details.length > 1200)) return res.status(400).json({ error: 'Les détails sont trop longs (maximum 1 200 caractères).' });
    const result = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: 'Rédige en français une description de produit pour une marketplace locale au Togo, environ 40 à 90 mots. Ne jamais inventer de caractéristiques non fournies. Retourne uniquement la description.',
      input: `Nom : ${nom.trim()}\nPrix : ${String(prix ?? 'non précisé').slice(0, 40)}\nCatégorie : ${String(categorie ?? 'non précisée').slice(0, 100)}\nDétails confirmés : ${String(details ?? 'aucun').slice(0, 1200)}`
    });
    const description = (result.output_text || '').trim();
    if (!description) return res.status(502).json({ error: 'Aucune description retournée. Réessayez.' });
    return res.json({ description });
  } catch (error) {
    console.error('generate-description:', error?.message || error);
    return res.status(500).json({ error: 'Erreur lors de la génération de la description.' });
  }
});

app.post('/api/improve-image', async (req, res) => {
  try {
    if (!client) return res.status(503).json({ error: 'Service IA non configuré : OPENAI_API_KEY manquante.' });
    const { imageDataUrl, prompt } = req.body || {};
    if (typeof imageDataUrl !== 'string' || !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageDataUrl)) return res.status(400).json({ error: 'Envoyez une image PNG, JPEG ou WebP valide.' });
    if (imageDataUrl.length > 20 * 1024 * 1024) return res.status(413).json({ error: 'Image trop volumineuse. Choisissez une photo de moins de 12 Mo.' });
    const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([\s\S]+)$/i);
    const mime = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const imageFile = new File([Buffer.from(match[2], 'base64')], `product.${ext}`, { type: mime });
    const result = await client.images.edit({
      model: 'gpt-image-1', image: imageFile,
      prompt: (typeof prompt === 'string' && prompt.trim() ? prompt.trim() : 'Améliorer la lumière et la netteté. Préserver le produit réel, sa forme, sa couleur, ses logos et détails. Ne rien ajouter ni retirer.').slice(0, 700),
      size: '1024x1024'
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: 'Aucune image améliorée retournée.' });
    return res.json({ imageDataUrl: `data:image/png;base64,${b64}` });
  } catch (error) {
    console.error('improve-image:', error?.message || error);
    return res.status(500).json({ error: 'Impossible de traiter cette photo. Vérifie le modèle et les autorisations de la clé IA.' });
  }
});

app.use((error, _req, res, _next) => {
  console.error('API middleware:', error?.message || error);
  const corsError = String(error?.message || '').startsWith('Origine non autorisée');
  res.status(corsError ? 403 : 500).json({ error: corsError ? 'Origine du site non autorisée. Vérifie FRONTEND_ORIGIN.' : 'Erreur interne du serveur IA.' });
});
app.listen(port, '0.0.0.0', () => console.log(`DigiCom AI écoute sur le port ${port}`));
