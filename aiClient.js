import { auth } from './firebase.js';

// Une seule URL de référence : celle du service IA hébergé sur Render (window.DIGICOM_AI_API_URL, index.html).
// Render gratuit : un serveur endormi peut mettre ~50 s à répondre, d'où ce délai maximal large.
const DELAI_MAX_MS = 90000;
const PAUSE_AVANT_REESSAI_MS = 3000;

// Réglages surchargeables (utile pour les tests) : window.DIGICOM_AI_TIMEOUT_MS, window.DIGICOM_AI_RETRY_PAUSE_MS
function reglage(nom, parDefaut) {
  const valeur = Number(window[nom]);
  return Number.isFinite(valeur) && valeur >= 0 ? valeur : parDefaut;
}

export class ErreurIA extends Error {
  constructor(message, { status = 0, retryable = false, timeout = false } = {}) {
    super(message);
    this.name = 'ErreurIA';
    this.status = status;       // code HTTP (0 = pas de réponse du serveur)
    this.retryable = retryable; // true : cela vaut la peine de réessayer
    this.timeout = timeout;
  }
}

function apiBase() {
  const configured = window.DIGICOM_AI_API_URL || '';
  return String(configured).trim().replace(/\/+$/, '');
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// À appeler à l'ouverture de l'assistant : réveille le serveur Render pendant que le vendeur remplit le formulaire.
// Ne bloque jamais et ne signale aucune erreur.
export function reveillerServeurIA() {
  const base = apiBase();
  if (!base || !/^https:\/\//i.test(base)) return;
  fetch(`${base}/api/health`, { method: 'GET', cache: 'no-store' }).catch(() => {});
}

async function envoyerUneFois(base, path, body, token) {
  const controller = new AbortController();
  const minuteur = setTimeout(() => controller.abort(), reglage('DIGICOM_AI_TIMEOUT_MS', DELAI_MAX_MS));

  let response;
  let raw;
  try {
    response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    raw = await response.text();
  } catch (cause) {
    console.error('DigiCom IA réseau:', cause);
    if (cause?.name === 'AbortError') {
      throw new ErreurIA('Le serveur IA met trop de temps à répondre. Réessayez dans un instant.', { retryable: true, timeout: true });
    }
    throw new ErreurIA('Connexion impossible au serveur IA. Il est peut-être en train de démarrer : réessayez dans un instant.', { retryable: true });
  } finally {
    clearTimeout(minuteur);
  }

  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw.slice(0, 300) }; }

  if (!response.ok) {
    throw new ErreurIA(data.error || data.message || `Erreur du service IA (${response.status}).`, {
      status: response.status,
      retryable: Boolean(data.retryable) || response.status === 503 || response.status === 429
    });
  }
  return data;
}

async function postJson(path, body) {
  const base = apiBase();
  if (!base || !/^https:\/\//i.test(base)) {
    throw new ErreurIA('Adresse HTTPS du serveur IA absente ou invalide dans index.html.');
  }
  const user = auth.currentUser;
  if (!user) throw new ErreurIA('Connectez-vous à votre compte DigiCom avant d’utiliser l’assistant IA.');
  const token = await user.getIdToken();

  try {
    return await envoyerUneFois(base, path, body, token);
  } catch (erreur) {
    // Un seul nouvel essai automatique : serveur en cours de réveil (aucune réponse) ou saturation 503.
    // Pas de nouvel essai après un délai dépassé, ni après un 429 (quota) : cela ne ferait qu'attendre plus longtemps.
    const reessayer = erreur instanceof ErreurIA && !erreur.timeout && (erreur.status === 0 || erreur.status === 503);
    if (!reessayer) throw erreur;
    await pause(reglage('DIGICOM_AI_RETRY_PAUSE_MS', PAUSE_AVANT_REESSAI_MS));
    return envoyerUneFois(base, path, body, token);
  }
}

export function genererDescriptionIA({ nom, prix, categorie, details }) {
  return postJson('/api/generate-description', { nom, prix, categorie, details });
}

export async function ameliorerImageIA({ file, prompt }) {
  if (!file) throw new ErreurIA('Choisissez d’abord une photo.');
  if (!file.type?.startsWith('image/')) throw new ErreurIA('Le fichier sélectionné n’est pas une image.');
  if (file.size > 12 * 1024 * 1024) throw new ErreurIA('La photo dépasse 12 Mo. Choisissez une image plus légère.');
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
