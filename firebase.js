import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig, FIRESTORE_DATABASE_ID } from './config.js';

// Utiliser exactement la base configurée dans config.js.
// Le projet DigiCom conserve ici l'identifiant historique 'default'.
const app = getApps().find((item) => item.name === '[DEFAULT]') || initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = FIRESTORE_DATABASE_ID === '(default)'
  ? getFirestore(app)
  : getFirestore(app, FIRESTORE_DATABASE_ID);

// Crée un compte avec une seconde instance Auth afin de ne pas déconnecter l'admin.
export async function creerCompteAuth(email, motDePasse) {
  const second = getApps().find((item) => item.name === 'digicom-secondaire')
    || initializeApp(firebaseConfig, 'digicom-secondaire');
  const auth2 = getAuth(second);
  try {
    const cred = await createUserWithEmailAndPassword(auth2, email, motDePasse);
    return cred.user.uid;
  } finally {
    await signOut(auth2).catch(() => {});
  }
}
