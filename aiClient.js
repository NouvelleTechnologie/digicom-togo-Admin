import { auth } from './firebase.js';

function apiBase() {
  const configured = window.DIGICOM_AI_API_URL || 'https://digicom-render-servers.onrender.com';
  return String(configured).replace(/\/+$/, '');
}

async function postJson(path, body) {
  const base = apiBase();
  if (!base) throw new Error('Le service IA n’est pas encore configuré. Le site doit recevoir l’URL HTTPS du serveur IA.');
  const user = auth.currentUser;
  if (!user) throw new Error('Connectez-vous à votre compte DigiCom avant d’utiliser l’assistant IA.');
  const token = await user.getIdToken();
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erreur du service IA (${response.status}).`);
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
