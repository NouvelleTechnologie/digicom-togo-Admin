import { jsx as _jsx } from 'react/jsx-runtime';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
const vide = { user: null, profile: null, abo: null, loading: false, error: '' };

function timestampDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function AuthProvider({ children }) {
  const [s, setS] = useState({ ...vide, loading: true });
  const requestId = useRef(0);

  const charger = async (u) => {
    const currentRequest = ++requestId.current;
    if (!u) {
      setS((previous) => ({ ...vide, error: previous.error }));
      return;
    }
    setS((previous) => ({ ...previous, user: u, loading: true, error: '' }));
    try {
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (currentRequest !== requestId.current) return;
      if (!snap.exists()) {
        await signOut(auth);
        if (currentRequest === requestId.current) setS({ ...vide, error: "Profil introuvable. Contacte l'administration." });
        return;
      }
      const profile = { uid: u.uid, ...snap.data() };
      if (profile.role === 'acheteur') {
        await signOut(auth);
        if (currentRequest === requestId.current) setS({ ...vide, error: "Ce compte est un compte acheteur : utilise l'application DigiCom (boutique)." });
        return;
      }
      if (profile.actif === false) {
        await signOut(auth);
        if (currentRequest === requestId.current) setS({ ...vide, error: "Compte désactivé. Contacte l'administration." });
        return;
      }
      window.__acteur = { uid: u.uid, nom: profile.nom || profile.email || 'Utilisateur', role: profile.role };
      let abo = null;
      if (profile.role === 'abonne') {
        const a = await getDoc(doc(db, 'abonnements', u.uid));
        if (currentRequest !== requestId.current) return;
        if (a.exists()) {
          const data = a.data();
          const fin = timestampDate(data.dateFin);
          abo = { ...data, fin, actif: data.actif !== false && !!fin && fin.getTime() > Date.now() };
        } else {
          abo = { actif: false, fin: null };
        }
      }
      if (currentRequest === requestId.current) setS({ user: u, profile, abo, loading: false, error: '' });
    } catch (e) {
      if (currentRequest === requestId.current) {
        console.error('DigiCom: erreur de chargement du profil Firebase', e);
        setS({ ...vide, error: `Connexion établie, mais impossible de lire le profil Firestore (${e.code || e.message || 'erreur inconnue'}). Vérifie la base Firestore et ses règles.` });
      }
    }
  };

  useEffect(() => onAuthStateChanged(auth, (u) => {
    if (window.__inscription) return;
    charger(u);
  }, (error) => {
    console.error('DigiCom: état Auth Firebase', error);
    setS({ ...vide, error: `Erreur Firebase Authentication : ${error.code || error.message}` });
  }), []);

  return _jsx(Ctx.Provider, { value: { ...s, recharger: () => charger(auth.currentUser) }, children });
}
