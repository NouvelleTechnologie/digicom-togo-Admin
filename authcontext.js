import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
const vide = { user: null, profile: null, abo: null, loading: false, error: '' };
export function AuthProvider({ children }) {
    const [s, setS] = useState({ ...vide, loading: true });
    const charger = async (u) => {
        if (!u) {
            setS((p) => ({ ...vide, error: p.error }));
            return;
        }
        try {
            const snap = await getDoc(doc(db, 'users', u.uid));
            if (!snap.exists()) {
                await signOut(auth);
                setS({ ...vide, error: "Profil introuvable. Contacte l'administration." });
                return;
            }
            const profile = { uid: u.uid, ...snap.data() };
            if (profile.role === 'acheteur') {
                await signOut(auth);
                setS({ ...vide, error: "Ce compte est un compte acheteur : utilise l'application DigiCom (boutique)." });
                return;
            }
            window.__acteur = { uid: u.uid, nom: profile.nom || profile.email || 'Utilisateur', role: profile.role };
            if (profile.actif === false) {
                await signOut(auth);
                setS({ ...vide, error: "Compte désactivé. Contacte l'administration." });
                return;
            }
            let abo = null;
            if (profile.role === 'abonne') {
                const a = await getDoc(doc(db, 'abonnements', u.uid));
                if (a.exists()) {
                    const d = a.data();
                    abo = { ...d, fin: d.dateFin.toDate(), actif: d.actif !== false && d.dateFin.toMillis() > Date.now() };
                }
                else
                    abo = { actif: false, fin: null };
            }
            setS({ user: u, profile, abo, loading: false, error: '' });
        }
        catch (e) {
            setS({ ...vide, error: 'Erreur de chargement : ' + e.message });
        }
    };
    useEffect(() => onAuthStateChanged(auth, (u) => {
        if (window.__inscription)
            return; // inscription en cours : la fiche n'existe pas encore
        charger(u);
    }), []);
    return _jsx(Ctx.Provider, { value: { ...s, recharger: () => charger(auth.currentUser) }, children: children });
}
