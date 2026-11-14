
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI, { toFile } from 'openai';

import {
  cert,
  getApps as getAdminApps,
  initializeApp as initializeAdminApp
} from 'firebase-admin/app';

import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const app = express();
const port = Number(process.env.PORT || 10000);

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || 'digicom-togo-6d3ea';

const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || '(default)';

// ==========================================
// CONFIGURATION CORS
// ==========================================

function normaliserOrigine(value) {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

const originesEnv = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(value => normaliserOrigine(value.trim()))
  .filter(Boolean);

const originesDefaut = [
  'https://nouvelletechnologie.github.io',
  'http://localhost:5173',
  'http://localhost:3000'
];

const originesAutorisees = new Set(
  originesEnv.length ? originesEnv : originesDefaut
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || originesAutorisees.has(normaliserOrigine(origin))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 86400
}));

app.use(express.json({ limit: '22mb' }));
app.disable('x-powered-by');

// ==========================================
// INITIALISATION FIREBASE ADMIN
// ==========================================

let adminApp = null;
let adminAuth = null;
let adminDb = null;

function parserServiceAccount(raw) {
  let text = (raw || '').trim();

  if (!text) return null;

  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      text = JSON.parse(text);
    } catch {}
  }

  const fixed = text.replace(
    /"private_key":\s*"([\s\S]*?)"/,
    (match, key) =>
      '"private_key":"' +
      key.replace(/\r/g, '').replace(/\n/g, '\\n') +
      '"'
  );

  const account = JSON.parse(fixed);

  if (account.private_key) {
    account.private_key = account.private_key.replace(/\\n/g, '\n');
  }

  return account;
}

try {
  let account = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    account = parserServiceAccount(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
  } else if (
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    account = {
      project_id: PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }

  if (account) {
    adminApp =
      getAdminApps().find(item => item.name === 'digicom-admin') ||
      initializeAdminApp(
        {
          credential: cert(account),
          projectId: PROJECT_ID
        },
        'digicom-admin'
      );

    adminAuth = getAdminAuth(adminApp);

    adminDb = FIRESTORE_DATABASE_ID === '(default)'
      ? getAdminFirestore(adminApp)
      : getAdminFirestore(adminApp, FIRESTORE_DATABASE_ID);

    console.log('Firebase Admin OK - base:', FIRESTORE_DATABASE_ID);
  } else {
    console.log('Firebase Admin : aucune clé trouvée');
  }
} catch (error) {
  console.error(
    'Firebase Admin non initialisé:',
    error?.message || error
  );
}

// ==========================================
// INITIALISATION OPENAI
// ==========================================

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ==========================================
// OUTILS
// ==========================================

function dateMillis(value) {
  if (!value) return 0;

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function jourActuelTogo() {
  const parties = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const valeurs = Object.fromEntries(
    parties.map(partie => [partie.type, partie.value])
  );

  return `${valeurs.year}-${valeurs.month}-${valeurs.day}`;
}

// ==========================================
// VERIFICATION DE L'ABONNEMENT DIGICOM
// ==========================================

async function verifierAbonne(req, res, next) {
  if (!adminAuth || !adminDb) {
    return res.status(503).json({
      error: "L'authentification Firebase Admin n'est pas configurée."
    });
  }

  const authorization = req.get('authorization') || '';

  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (!token) {
    return res.status(401).json({
      error: 'Connexion DigiCom requise.'
    });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);

    const profileSnap = await adminDb
      .collection('users')
      .doc(decoded.uid)
      .get();

    if (!profileSnap.exists) {
      return res.status(403).json({
        error: 'Profil DigiCom introuvable.'
      });
    }

    const profile = profileSnap.data();

    if (
      profile.role !== 'abonne' ||
      profile.actif === false
    ) {
      return res.status(403).json({
        error: 'Cette fonction IA est réservée aux vendeurs abonnés actifs.'
      });
    }

    const aboSnap = await adminDb
      .collection('abonnements')
      .doc(decoded.uid)
      .get();

    if (!aboSnap.exists) {
      return res.status(403).json({
        error: "Aucun abonnement vendeur n'est enregistré."
      });
    }

    const abo = aboSnap.data();

    if (
      abo.actif === false ||
      dateMillis(abo.dateFin) <= Date.now()
    ) {
      return res.status(403).json({
        error: 'Ton abonnement DigiCom est expiré ou inactif.'
      });
    }

    req.digicomUser = {
      uid: decoded.uid,
      nom: profile.nom || profile.email || 'Vendeur'
    };

    return next();

  } catch (error) {
    console.error(
      'Vérification Firebase du token:',
      error?.message || error
    );

    return res.status(401).json({
      error: 'Session DigiCom invalide ou expirée. Déconnecte-toi puis reconnecte-toi.'
    });
  }
}

// ==========================================
// QUOTAS IA QUOTIDIENS
// ==========================================

const LIMITES_IA = {
  description: 5,
  photo: 2
};

function champQuota(type) {
  if (type === 'description') return 'descriptions';
  if (type === 'photo') return 'photos';

  throw new Error('Type de quota inconnu.');
}

async function reserverQuotaIA(uid, type) {
  const limite = LIMITES_IA[type];
  const champ = champQuota(type);
  const jour = jourActuelTogo();

  if (!limite) {
    throw new Error('Limite IA inconnue.');
  }

  const ref = adminDb
    .collection('quotas_ia')
    .doc(`${uid}_${jour}`);

  return adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);

    const donnees = snapshot.exists
      ? snapshot.data()
      : {};

    const utilise = Number(donnees[champ] || 0);

    if (utilise >= limite) {
      return {
        ok: false,
        utilise,
        limite,
        restant: 0
      };
    }

    const nouveauTotal = utilise + 1;

    transaction.set(ref, {
      uid,
      jour,
      [champ]: nouveauTotal,
      updatedAt: Date.now()
    }, { merge: true });

    return {
      ok: true,
      utilise: nouveauTotal,
      limite,
      restant: limite - nouveauTotal,
      reservation: {
        uid,
        jour,
        champ,
        refId: `${uid}_${jour}`
      }
    };
  });
}

// ==========================================
// RESTITUTION D'UN QUOTA EN CAS D'ECHEC
// ==========================================

async function rembourserQuotaIA(reservation) {
  if (!reservation) return;

  const ref = adminDb
    .collection('quotas_ia')
    .doc(reservation.refId);

  await adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) return;

    const donnees = snapshot.data();
    const utilise = Number(donnees[reservation.champ] || 0);

    transaction.set(ref, {
      [reservation.champ]: Math.max(0, utilise - 1),
      updatedAt: Date.now()
    }, { merge: true });
  });
}

// ==========================================
// ROUTES GENERALES
// ==========================================

app.get('/', (_req, res) => {
  res.type('text').send('DigiCom AI service is running.');
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'digicom-ai',
    openaiConfigured: Boolean(client),
    firebaseAdminConfigured: Boolean(adminAuth && adminDb),
    configured: Boolean(client && adminAuth && adminDb)
  });
});

// ==========================================
// GENERATION DE DESCRIPTION
// ==========================================

app.post(
  '/api/generate-description',
  verifierAbonne,
  async (req, res) => {

    let reservation = null;

    try {
      if (!client) {
        return res.status(503).json({
          error: "La clé OPENAI_API_KEY n'est pas configurée."
        });
      }

      const { nom, prix, categorie, details } = req.body || {};

      if (
        typeof nom !== 'string' ||
        nom.trim().length < 2 ||
        nom.trim().length > 120
      ) {
        return res.status(400).json({
          error: 'Le nom du produit doit contenir de 2 à 120 caractères.'
        });
      }

      if (
        details != null &&
        (typeof details !== 'string' || details.length > 1200)
      ) {
        return res.status(400).json({
          error: 'Les détails sont trop longs (maximum 1 200 caractères).'
        });
      }

      // Réserver une utilisation
      const quota = await reserverQuotaIA(
        req.digicomUser.uid,
        'description'
      );

      if (!quota.ok) {
        return res.status(429).json({
          error: 'Tu as atteint tes 5 descriptions IA quotidiennes. Reviens demain.',
          quota: {
            utilise: quota.utilise,
            limite: quota.limite,
            restant: 0
          }
        });
      }

      reservation = quota.reservation;

      const result = await client.responses.create({
        model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',

        instructions:
          'Rédige en français une description de produit pour une marketplace locale au Togo, environ 40 à 90 mots. Sois clair et attractif sans inventer de marque, qualité certifiée, origine, garantie, ingrédients, dimensions, stock, propriétés médicales ou caractéristiques non fournies. Ne modifie pas le prix. Retourne uniquement la description.',

        input:
          `Nom : ${nom.trim()}\n` +
          `Prix indiqué : ${String(prix ?? 'non précisé').slice(0, 40)}\n` +
          `Catégorie : ${String(categorie ?? 'non précisée').slice(0, 100)}\n` +
          `Détails confirmés : ${String(details ?? 'aucun').slice(0, 1200)}`
      });

      const description = (result.output_text || '').trim();

      if (!description) {
        await rembourserQuotaIA(reservation);
        reservation = null;

        return res.status(502).json({
          error: 'Aucune description retournée. Réessaie.'
        });
      }

      // La génération a réussi : le quota est consommé.
      const quotaRestant = quota.restant;
      reservation = null;

      return res.json({
        description,
        quota: {
          utilise: quota.utilise,
          limite: quota.limite,
          restant: quotaRestant
        }
      });

    } catch (error) {
      if (reservation) {
        await rembourserQuotaIA(reservation)
          .catch(err => console.error('Remboursement quota:', err));

        reservation = null;
      }

      console.error(
        'generate-description:',
        error?.status || '',
        error?.message || error
      );

      return res.status(502).json({
        error: "Le moteur de description IA n'a pas pu traiter la demande.",
        detail: error?.status === 429
          ? 'Le quota ou le budget API OpenAI est insuffisant.'
          : undefined
      });
    }
  }
);

// ==========================================
// AMELIORATION DE PHOTO
// ==========================================

app.post(
  '/api/improve-image',
  verifierAbonne,
  async (req, res) => {

    let reservation = null;

    try {
      if (!client) {
        return res.status(503).json({
          error: "La clé OPENAI_API_KEY n'est pas configurée."
        });
      }

      const { imageDataUrl, prompt } = req.body || {};

      const match = typeof imageDataUrl === 'string'
        ? imageDataUrl.match(
            /^data:image\/(png|jpeg|jpg|webp);base64,([\s\S]+)$/i
          )
        : null;

      if (!match) {
        return res.status(400).json({
          error: 'Envoie une image PNG, JPEG ou WebP valide.'
        });
      }

      const mime =
        `image/${match[1].toLowerCase().replace('jpg', 'jpeg')}`;

      const bytes = Buffer.from(match[2], 'base64');

      if (!bytes.length || bytes.length > 12 * 1024 * 1024) {
        return res.status(413).json({
          error: 'La photo doit peser au maximum 12 Mo.'
        });
      }

      const extension =
        mime === 'image/png'
          ? 'png'
          : mime === 'image/webp'
            ? 'webp'
            : 'jpg';

      const imageFile = await toFile(
        bytes,
        `produit.${extension}`,
        { type: mime }
      );

      // Réserver une utilisation
      const quota = await reserverQuotaIA(
        req.digicomUser.uid,
        'photo'
      );

      if (!quota.ok) {
        return res.status(429).json({
          error: 'Tu as atteint tes 2 améliorations de photos quotidiennes. Reviens demain.',
          quota: {
            utilise: quota.utilise,
            limite: quota.limite,
            restant: 0
          }
        });
      }

      reservation = quota.reservation;


import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI, { toFile } from 'openai';

import {
  cert,
  getApps as getAdminApps,
  initializeApp as initializeAdminApp
} from 'firebase-admin/app';

import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const app = express();
const port = Number(process.env.PORT || 10000);

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || 'digicom-togo-6d3ea';

const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || '(default)';

// ==========================================
// CONFIGURATION CORS
// ==========================================

function normaliserOrigine(value) {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

const originesEnv = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(value => normaliserOrigine(value.trim()))
  .filter(Boolean);

const originesDefaut = [
  'https://nouvelletechnologie.github.io',
  'http://localhost:5173',
  'http://localhost:3000'
];

const originesAutorisees = new Set(
  originesEnv.length ? originesEnv : originesDefaut
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || originesAutorisees.has(normaliserOrigine(origin))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 86400
}));

app.use(express.json({ limit: '22mb' }));
app.disable('x-powered-by');

// ==========================================
// INITIALISATION FIREBASE ADMIN
// ==========================================

let adminApp = null;
let adminAuth = null;
let adminDb = null;

function parserServiceAccount(raw) {
  let text = (raw || '').trim();

  if (!text) return null;

  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      text = JSON.parse(text);
    } catch {}
  }

  const fixed = text.replace(
    /"private_key":\s*"([\s\S]*?)"/,
    (match, key) =>
      '"private_key":"' +
      key.replace(/\r/g, '').replace(/\n/g, '\\n') +
      '"'
  );

  const account = JSON.parse(fixed);

  if (account.private_key) {
    account.private_key = account.private_key.replace(/\\n/g, '\n');
  }

  return account;
}

try {
  let account = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    account = parserServiceAccount(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
  } else if (
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    account = {
      project_id: PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }

  if (account) {
    adminApp =
      getAdminApps().find(item => item.name === 'digicom-admin') ||
      initializeAdminApp(
        {
          credential: cert(account),
          projectId: PROJECT_ID
        },
        'digicom-admin'
      );

    adminAuth = getAdminAuth(adminApp);

    adminDb = FIRESTORE_DATABASE_ID === '(default)'
      ? getAdminFirestore(adminApp)
      : getAdminFirestore(adminApp, FIRESTORE_DATABASE_ID);

    console.log('Firebase Admin OK - base:', FIRESTORE_DATABASE_ID);
  } else {
    console.log('Firebase Admin : aucune clé trouvée');
  }
} catch (error) {
  console.error(
    'Firebase Admin non initialisé:',
    error?.message || error
  );
}

// ==========================================
// INITIALISATION OPENAI
// ==========================================

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ==========================================
// OUTILS
// ==========================================

function dateMillis(value) {
  if (!value) return 0;

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function jourActuelTogo() {
  const parties = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const valeurs = Object.fromEntries(
    parties.map(partie => [partie.type, partie.value])
  );

  return `${valeurs.year}-${valeurs.month}-${valeurs.day}`;
}

// ==========================================
// VERIFICATION DE L'ABONNEMENT DIGICOM
// ==========================================

async function verifierAbonne(req, res, next) {
  if (!adminAuth || !adminDb) {
    return res.status(503).json({
      error: "L'authentification Firebase Admin n'est pas configurée."
    });
  }

  const authorization = req.get('authorization') || '';

  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (!token) {
    return res.status(401).json({
      error: 'Connexion DigiCom requise.'
    });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);

    const profileSnap = await adminDb
      .collection('users')
      .doc(decoded.uid)
      .get();

    if (!profileSnap.exists) {
      return res.status(403).json({
        error: 'Profil DigiCom introuvable.'
      });
    }

    const profile = profileSnap.data();

    if (
      profile.role !== 'abonne' ||
      profile.actif === false
    ) {
      return res.status(403).json({
        error: 'Cette fonction IA est réservée aux vendeurs abonnés actifs.'
      });
    }

    const aboSnap = await adminDb
      .collection('abonnements')
      .doc(decoded.uid)
      .get();

    if (!aboSnap.exists) {
      return res.status(403).json({
        error: "Aucun abonnement vendeur n'est enregistré."
      });
    }

    const abo = aboSnap.data();

    if (
      abo.actif === false ||
      dateMillis(abo.dateFin) <= Date.now()
    ) {
      return res.status(403).json({
        error: 'Ton abonnement DigiCom est expiré ou inactif.'
      });
    }

    req.digicomUser = {
      uid: decoded.uid,
      nom: profile.nom || profile.email || 'Vendeur'
    };

    return next();

  } catch (error) {
    console.error(
      'Vérification Firebase du token:',
      error?.message || error
    );

    return res.status(401).json({
      error: 'Session DigiCom invalide ou expirée. Déconnecte-toi puis reconnecte-toi.'
    });
  }
}

// ==========================================
// QUOTAS IA QUOTIDIENS
// ==========================================

const LIMITES_IA = {
  description: 5,
  photo: 2
};

function champQuota(type) {
  if (type === 'description') return 'descriptions';
  if (type === 'photo') return 'photos';

  throw new Error('Type de quota inconnu.');
}

async function reserverQuotaIA(uid, type) {
  const limite = LIMITES_IA[type];
  const champ = champQuota(type);
  const jour = jourActuelTogo();

  if (!limite) {
    throw new Error('Limite IA inconnue.');
  }

  const ref = adminDb
    .collection('quotas_ia')
    .doc(`${uid}_${jour}`);

  return adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);

    const donnees = snapshot.exists
      ? snapshot.data()
      : {};

    const utilise = Number(donnees[champ] || 0);

    if (utilise >= limite) {
      return {
        ok: false,
        utilise,
        limite,
        restant: 0
      };
    }

    const nouveauTotal = utilise + 1;

    transaction.set(ref, {
      uid,
      jour,
      [champ]: nouveauTotal,
      updatedAt: Date.now()
    }, { merge: true });

    return {
      ok: true,
      utilise: nouveauTotal,
      limite,
      restant: limite - nouveauTotal,
      reservation: {
        uid,
        jour,
        champ,
        refId: `${uid}_${jour}`
      }
    };
  });
}

// ==========================================
// RESTITUTION D'UN QUOTA EN CAS D'ECHEC
// ==========================================

async function rembourserQuotaIA(reservation) {
  if (!reservation) return;

  const ref = adminDb
    .collection('quotas_ia')
    .doc(reservation.refId);

  await adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) return;

    const donnees = snapshot.data();
    const utilise = Number(donnees[reservation.champ] || 0);

    transaction.set(ref, {
      [reservation.champ]: Math.max(0, utilise - 1),
      updatedAt: Date.now()
    }, { merge: true });
  });
}

// ==========================================
// ROUTES GENERALES
// ==========================================

app.get('/', (_req, res) => {
  res.type('text').send('DigiCom AI service is running.');
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'digicom-ai',
    openaiConfigured: Boolean(client),
    firebaseAdminConfigured: Boolean(adminAuth && adminDb),
    configured: Boolean(client && adminAuth && adminDb)
  });
});

// ==========================================
// GENERATION DE DESCRIPTION
// ==========================================

app.post(
  '/api/generate-description',
  verifierAbonne,
  async (req, res) => {

    let reservation = null;

    try {
      if (!client) {
        return res.status(503).json({
          error: "La clé OPENAI_API_KEY n'est pas configurée."
        });
      }

      const { nom, prix, categorie, details } = req.body || {};

      if (
        typeof nom !== 'string' ||
        nom.trim().length < 2 ||
        nom.trim().length > 120
      ) {
        return res.status(400).json({
          error: 'Le nom du produit doit contenir de 2 à 120 caractères.'
        });
      }

      if (
        details != null &&
        (typeof details !== 'string' || details.length > 1200)
      ) {
        return res.status(400).json({
          error: 'Les détails sont trop longs (maximum 1 200 caractères).'
        });
      }

      // Réserver une utilisation
      const quota = await reserverQuotaIA(
        req.digicomUser.uid,
        'description'
      );

      if (!quota.ok) {
        return res.status(429).json({
          error: 'Tu as atteint tes 5 descriptions IA quotidiennes. Reviens demain.',
          quota: {
            utilise: quota.utilise,
            limite: quota.limite,
            restant: 0
          }
        });
      }

      reservation = quota.reservation;

      const result = await client.responses.create({
        model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',

        instructions:
          'Rédige en français une description de produit pour une marketplace locale au Togo, environ 40 à 90 mots. Sois clair et attractif sans inventer de marque, qualité certifiée, origine, garantie, ingrédients, dimensions, stock, propriétés médicales ou caractéristiques non fournies. Ne modifie pas le prix. Retourne uniquement la description.',

        input:
          `Nom : ${nom.trim()}\n` +
          `Prix indiqué : ${String(prix ?? 'non précisé').slice(0, 40)}\n` +
          `Catégorie : ${String(categorie ?? 'non précisée').slice(0, 100)}\n` +
          `Détails confirmés : ${String(details ?? 'aucun').slice(0, 1200)}`
      });

      const description = (result.output_text || '').trim();

      if (!description) {
        await rembourserQuotaIA(reservation);
        reservation = null;

        return res.status(502).json({
          error: 'Aucune description retournée. Réessaie.'
        });
      }

      // La génération a réussi : le quota est consommé.
      const quotaRestant = quota.restant;
      reservation = null;

      return res.json({
        description,
        quota: {
          utilise: quota.utilise,
          limite: quota.limite,
          restant: quotaRestant
        }
      });

    } catch (error) {
      if (reservation) {
        await rembourserQuotaIA(reservation)
          .catch(err => console.error('Remboursement quota:', err));

        reservation = null;
      }

      console.error(
        'generate-description:',
        error?.status || '',
        error?.message || error
      );

      return res.status(502).json({
        error: "Le moteur de description IA n'a pas pu traiter la demande.",
        detail: error?.status === 429
          ? 'Le quota ou le budget API OpenAI est insuffisant.'
          : undefined
      });
    }
  }
);

// ==========================================
// AMELIORATION DE PHOTO
// ==========================================

app.post(
  '/api/improve-image',
  verifierAbonne,
  async (req, res) => {

    let reservation = null;

    try {
      if (!client) {
        return res.status(503).json({
          error: "La clé OPENAI_API_KEY n'est pas configurée."
        });
      }

      const { imageDataUrl, prompt } = req.body || {};

      const match = typeof imageDataUrl === 'string'
        ? imageDataUrl.match(
            /^data:image\/(png|jpeg|jpg|webp);base64,([\s\S]+)$/i
          )
        : null;

      if (!match) {
        return res.status(400).json({
          error: 'Envoie une image PNG, JPEG ou WebP valide.'
        });
      }

      const mime =
        `image/${match[1].toLowerCase().replace('jpg', 'jpeg')}`;

      const bytes = Buffer.from(match[2], 'base64');

      if (!bytes.length || bytes.length > 12 * 1024 * 1024) {
        return res.status(413).json({
          error: 'La photo doit peser au maximum 12 Mo.'
        });
      }

      const extension =
        mime === 'image/png'
          ? 'png'
          : mime === 'image/webp'
            ? 'webp'
            : 'jpg';

      const imageFile = await toFile(
        bytes,
        `produit.${extension}`,
        { type: mime }
      );

      // Réserver une utilisation
      const quota = await reserverQuotaIA(
        req.digicomUser.uid,
        'photo'
      );

      if (!quota.ok) {
        return res.status(429).json({
          error: 'Tu as atteint tes 2 améliorations de photos quotidiennes. Reviens demain.',
          quota: {
            utilise: quota.utilise,
            limite: quota.limite,
            restant: 0
          }
        });
      }

      reservation = quota.reservation;

      const imageResponse = await client.images.edit({
        model:
          process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst',

        image: imageFile,

        prompt:
          (typeof prompt === 'string' && prompt.trim()
            ? prompt.trim()
            : 'Améliore uniquement la lumière, le cadrage et la netteté de la photo du produit. Préserve fidèlement le produit réel, sa forme, sa couleur, son logo et tous ses détails. N’ajoute et ne retire aucun élément.')
            .slice(0, 2000),

        size: '1024x1024'
      });

      const base64 = imageResponse.data?.[0]?.b64_json;

      if (!base64) {
        await rembourserQuotaIA(reservation);
        reservation = null;

        return res.status(502).json({
          error: "Aucune image améliorée n'a été retournée."
        });
      }

      // La génération a réussi : le quota est consommé.
      const quotaRestant = quota.restant;
      reservation = null;

      return res.json({
        imageDataUrl: `data:image/png;base64,${base64}`,
        quota: {
          utilise: quota.utilise,
          limite: quota.limite,
          restant: quotaRestant
        }
      });

    } catch (error) {
      if (reservation) {
        await rembourserQuotaIA(reservation)
          .catch(err => console.error('Remboursement quota:', err));

        reservation = null;
      }

      console.error(
        'improve-image:',
        error?.status || '',
        error?.message || error
      );

      return res.status(502).json({
        error: "Le moteur d'image IA n'a pas pu traiter cette photo.",
        detail: error?.status === 429
          ? 'Le quota ou le budget API OpenAI est insuffisant.'
          : undefined
      });
    }
  }
);

// ==========================================
// GESTION DES ERREURS
// ==========================================

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Image trop volumineuse. Maximum 12 Mo.'
    });
  }

  console.error(
    'Erreur serveur DigiCom IA:',
    error?.message || error
  );

  return res.status(500).json({
    error: 'Erreur interne du serveur DigiCom IA.'
  });
});

// ==========================================
// DEMARRAGE DU SERVEUR
// ==========================================

app.listen(port, '0.0.0.0', () => {
  console.log(`DigiCom AI écoute sur le port ${port}`);
});
