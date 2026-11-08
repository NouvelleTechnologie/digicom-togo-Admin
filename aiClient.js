import { auth } from './firebase.js';

function apiBase() {
  const configured = String(window.DIGICOM_AI_API_URL || '').trim();
  if (!configured) {
    throw new Error("Le serveur IA n'est pas configuré. Il faut d'abord déployer le backend IA sur Render, puis inscrire son URL HTTPS dans index.html.");
  }
  let parsed;
  try { parsed = new URL(configured); } catch {
    throw new Error("L'adresse du serveur IA est invalide. Exemple : https://mon-service-ia.onrender.com");
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    throw new Error("Le serveur IA doit utiliser une adresse HTTPS sécurisée.");
  }
  return parsed.origin;
}

async function postJson(path, body, timeoutMs = 120000) {
  const base = apiBase();
  const user = auth.currentUser;
  if (!user) throw new Error('Connecte-toi à ton compte DigiCom avant d’utiliser l’assistant IA.');
  const token = await user.getIdToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Le serveur IA met trop de temps à répondre. Réessaie dans un instant : Render peut être en phase de réveil.');
    }
    throw new Error("Connexion au serveur IA impossible (Failed to fetch). Vérifie l'URL HTTPS du backend, son état sur Render et l'autorisation CORS de https://nouvelletechnologie.github.io.");
  } finally {
    clearTimeout(timer);
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    const message = data.error || (response.status === 404
      ? "Route IA introuvable. Le service Render déployé n'est probablement pas le backend DigiCom."
      : `Le serveur IA a répondu avec le code ${response.status}.`);
    throw new Error(message);
  }
  if (!contentType.includes('application/json')) {
    throw new Error("Le serveur IA a répondu, mais pas au format JSON. Vérifie que l'URL pointe vers le backend et non vers le site web.");
  }
  return data;
}

export function genererDescriptionIA({ nom, prix, categorie, details }) {
  return postJson('/api/generate-description', { nom, prix, categorie, details }, 90000);
}

export async function ameliorerImageIA({ file, prompt }) {
  if (!file) throw new Error('Choisis d’abord une photo.');
  if (!file.type?.startsWith('image/')) throw new Error('Le fichier sélectionné n’est pas une image.');
  if (file.size > 12 * 1024 * 1024) throw new Error('La photo dépasse 12 Mo. Choisis une image plus légère.');
  const base64 = await fileToDataUrl(file);
  return postJson('/api/improve-image', {
    imageDataUrl: base64,
    prompt: prompt || 'Améliorer l’éclairage et la netteté. Préserver strictement le produit réel, sa forme, sa couleur, son logo et ses détails. Ne rien ajouter ni retirer.'
  }, 180000);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossible de lire cette image.'));
    reader.readAsDataURL(file);
  });
}
