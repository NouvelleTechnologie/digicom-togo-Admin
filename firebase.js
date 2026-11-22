import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config.js';
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, 'default');
// Crée un compte Auth SANS déconnecter l'admin (2e instance Firebase)
export async function creerCompteAuth(email, motDePasse) {
    const second = getApps().find((a) => a.name === 'secondaire') || initializeApp(firebaseConfig, 'secondaire');
    const auth2 = getAuth(second);
    const cred = await createUserWithEmailAndPassword(auth2, email, motDePasse);
    await signOut(auth2);
    return cred.user.uid;
}
