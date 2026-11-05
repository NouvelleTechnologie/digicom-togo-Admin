import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config.js';

// Reuse the default Firebase app if this module is loaded more than once.
const app = getApps().find((item) => item.name === '[DEFAULT]') || initializeApp(firebaseConfig);
export const auth = getAuth(app);
// IMPORTANT: getFirestore(app) targets the standard '(default)' database.
// Passing 'default' as a databaseId points to a different, usually nonexistent DB.
export const db = getFirestore(app);

// Create a user with a secondary Auth instance so the administrator stays signed in.
export async function creerCompteAuth(email, motDePasse) {
  const second = getApps().find((item) => item.name === 'secondaire') || initializeApp(firebaseConfig, 'secondaire');
  const auth2 = getAuth(second);
  const cred = await createUserWithEmailAndPassword(auth2, email, motDePasse);
  await signOut(auth2);
  return cred.user.uid;
}
