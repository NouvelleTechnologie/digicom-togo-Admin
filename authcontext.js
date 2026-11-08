import { jsx as _jsx } from 'react/jsx-runtime';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
const vide = { user: null, profile: null, abo: null, loading: false, error: '' };

function dateDepuisFirestore(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function AuthProvider({ children }) {
  const [s, setS] = useState({ ...vide, loading: true });
  const generation = useRef(0);
  const pendingAuthError = useRef('');

  const charger = async (u) => {
    const current = ++generation.current;
    if (!u) {
      window.__acteur = null;
      const error = pendingAuthError.current;
      pendingAuthError.current = '';
      setS({ ...vide, error });
      return;
    }
    pendingAuthError.current = '';
    setS({ ...vide, user: u, loading: true });
    try {
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (current !== generation.current) return;
      if (!snap.exists()) {
        const message = "Profil introuvable. Contacte l'administration.";
        pendingAuthError.current = message;
        await signOut(auth).catch(() => {});
        if (current === generation.current) setS({ ...vide, error: message });
        return;
      }

      const profile = { uid: u.uid, ...snap.data() };
      if (profile.actif === false) {
        const message = "Compte désactivé. Contacte l'administration.";
        pendingAuthError.current = message;
        await signOut(auth).catch(() => {});
        if (current === generation.current) setS({ ...vide, error: message });
        return;
      }
      if (!['admin', 'abonne', 'livreur', 'chef', 'stats'].includes(profile.role)) {
        const message = "Ce compte n'a pas accès à l'espace équipe DigiCom.";
        pendingAuthError.current = message;
        await signOut(auth).catch(() => {});
        if (current === generation.current) setS({ ...vide, error: message });
        return;
      }

      window.__acteur = { uid: u.uid, nom: profile.nom || profile.email || 'Utilisateur', role: profile.role };
      let abo = null;
      if (profile.role === 'abonne') {
        const a = await getDoc(doc(db, 'abonnements', u.uid));
        if (current !== generation.current) return;
        if (a.exists()) {
          const data = a.data();
          const fin = dateDepuisFirestore(data.dateFin);
          abo = { ...data, fin, actif: data.actif !== false && Boolean(fin) && fin.getTime() > Date.now() };
        } else {
          abo = { actif: false, fin: null };
        }
      }
      if (current === generation.current) setS({ user: u, profile, abo, loading: false, error: '' });
    } catch (e) {
      console.error('DigiCom auth/profile:', e);
      if (current === generation.current) {
        setS({ ...vide, user: u, error: 'Connexion établie, mais profil Firebase impossible à lire : ' + (e?.message || 'erreur inconnue') });
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (window.__inscription) return;
      charger(u);
    }, (error) => {
      console.error('Firebase Auth listener:', error);
      setS({ ...vide, error: 'Erreur de connexion Firebase : ' + (error?.message || 'vérifie Internet et la configuration Firebase.') });
    });
    return () => {
      generation.current += 1;
      unsubscribe();
    };
  }, []);

  return _jsx(Ctx.Provider, {
    value: { ...s, recharger: () => charger(auth.currentUser) },
    children
  });
}
