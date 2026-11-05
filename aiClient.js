import { auth } from './firebase.js';
function apiBase() { return String(window.DIGICOM_AI_API_URL || '').trim().replace(/\/+$/, ''); }
async function postJson(path, body) {
  const base = apiBase();
  if (!base) throw new Error('Serveur IA non configuré. Cela ne bloque pas la connexion à DigiCom : renseigne l’URL HTTPS du backend IA séparé.');
  const user = auth.currentUser;
  if (!user) throw new Error('Connecte-toi à DigiCom avant d’utiliser l’assistant IA.');
  let token;
  try { token = await user.getIdToken(); } catch (error) { throw new Error(`Session Firebase indisponible : ${error.message || error}`); }
  let response;
  try {
    response = await fetch(`${base}${path}`, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  } catch (error) {
    throw new Error(`Serveur IA injoignable (${base}). Vérifie l’URL, le démarrage Render et CORS. Détail : ${error.message || 'erreur réseau'}`);
  }
  const type = response.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok) throw new Error(data.error || `Erreur du serveur IA : HTTP ${response.status}.`);
  if (!type.includes('application/json')) throw new Error('Réponse non JSON : l’URL indiquée ne semble pas être le backend DigiCom.');
  return data;
}
export function genererDescriptionIA({ nom, prix, categorie, details }) { return postJson('/api/generate-description', { nom, prix, categorie, details }); }
export async function ameliorerImageIA({ file, prompt }) {
  if (!file) throw new Error('Choisis d’abord une photo.');
  if (!file.type?.startsWith('image/')) throw new Error('Le fichier sélectionné n’est pas une image.');
  if (file.size > 12 * 1024 * 1024) throw new Error('La photo dépasse 12 Mo.');
  const imageDataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(new Error('Impossible de lire cette image.')); reader.readAsDataURL(file); });
  return postJson('/api/improve-image', { imageDataUrl, prompt: prompt || 'Améliorer l’éclairage et la netteté. Préserver strictement le produit réel, sa forme, sa couleur, son logo et ses détails. Ne rien ajouter ni retirer.' });
}
