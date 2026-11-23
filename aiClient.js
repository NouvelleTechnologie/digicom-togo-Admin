import { auth } from './firebase.js';
//import { genererDescriptionIA, ameliorerImageIA } from './aiClient';

// Une seule URL de référence : celle du service IA Render.
function apiBase() {
  const configured = window.DIGICOM_AI_API_URL || '';
  return String(configured).trim().replace(/\/+$/, '');
}

async function postJson(path, body) {
  const base = apiBase();
  if (!base || !/^https:\/\//i.test(base)) {
    throw new Error('Adresse HTTPS du serveur IA absente ou invalide dans index.html.');
  }
  const user = auth.currentUser;
  if (!user) throw new Error('Connectez-vous à votre compte DigiCom avant d’utiliser l’assistant IA.');
  const token = await user.getIdToken();
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
  } catch (cause) {
    console.error('DigiCom IA réseau:', cause);
    throw new Error(`Connexion impossible au serveur IA (${base}). Vérifiez Render et CORS.`);
  }
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw.slice(0, 300) }; }
  if (!response.ok) {
    const message = data.error || data.message || `Erreur du service IA (${response.status}).`;
    throw new Error(`${message} [HTTP ${response.status}]`);
  }
  return data;
}

export function genererDescriptionIA({ nom, prix, categorie, details }) {
  return postJson('/api/generate-description', { nom, prix, categorie, details });
}

export async function ameliorerImageIA({ file, prompt }) {
  if (!file) throw new Error('Choisissez d’abord une photo.');
  if (!file.type?.startsWith('image/')) throw new Error('Le fichier sélectionné n’est pas une image.');
  if (file.size > 12 * 1024 * 1024) throw new Error('La photo dépasse 12 Mo. Choisissez une image plus légère.');
  const base64 = await fileToDataUrl(file);
  return postJson('/api/improve-image', {
    imageDataUrl: base64,
    prompt: prompt || 'Améliorer l’éclairage et la netteté. Préserver strictement le produit réel, sa forme, sa couleur, son logo et ses détails. Ne rien ajouter ni retirer.'
  });
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossible de lire cette image.'));
    reader.readAsDataURL(file);
  });
}
