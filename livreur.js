import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { collection, doc, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { useAuth } from './authcontext.js';
import { useLive } from './hooks.js';
import { VILLE_DEFAUT } from './config.js';
import { parRecent, mapsLien, compresserImage, lireDataUrl, messageErreur } from './utils.js';
import { logAction } from './services.js';
import Layout, { Onglets } from './layout.js';
import { Alerte, Chargement, Vide, CarteCommande } from './ui.js';
// Preuve de livraison : photo obligatoire + note facultative
function Preuve({ o, fermer }) {
    const [photo, setPhoto] = useState(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const valider = async () => {
        if (!photo)
            return setErr('Prends une photo comme preuve de livraison.');
        setBusy(true);
        setErr('');
        try {
            const data = await lireDataUrl(await compresserImage(photo, 600, 0.6));
            await updateDoc(doc(db, 'commandes', o.id), {
                statut: 'livree', preuve: { photo: data, note: note.trim() }, livreeAt: serverTimestamp(), updatedAt: serverTimestamp(),
            });
            logAction('Livraison confirmée', '#' + o.id.slice(0, 6).toUpperCase());
            fermer();
        }
        catch (x) {
            setErr(messageErreur(x));
        }
        setBusy(false);
    };
    return (_jsxs("div", { style: { marginTop: 10 }, children: [_jsx("label", { children: "Photo de preuve (colis remis au client)" }), _jsx("input", { type: "file", accept: "image/*", capture: "environment", onChange: (e) => setPhoto(e.target.files[0] || null) }), _jsx("label", { children: "Note (facultatif)" }), _jsx("input", { value: note, onChange: (e) => setNote(e.target.value), placeholder: "Ex. remis au gardien" }), _jsx(Alerte, { children: err }), _jsxs("div", { className: "actions", children: [_jsx("button", { className: "btn", disabled: busy, onClick: valider, children: busy ? 'Envoi…' : 'Confirmer la livraison' }), _jsx("button", { className: "btn gris-b", onClick: fermer, children: "Annuler" })] })] }));
}
export default function Livreur() {
    const { profile } = useAuth();
    const cmds = useLive(() => query(collection(db, 'commandes'), where('livreurId', '==', profile.uid)), [profile.uid]);
    const [t, setT] = useState('actives');
    const [preuve, setPreuve] = useState(null);
    const demarrer = async (o) => {
        await updateDoc(doc(db, 'commandes', o.id), { statut: 'en_cours', updatedAt: serverTimestamp() });
        logAction('Livraison démarrée', '#' + o.id.slice(0, 6).toUpperCase());
    };
    const liste = (cmds || []).filter((o) => (t === 'actives' ? o.statut !== 'livree' : o.statut === 'livree')).sort(parRecent);
    return (_jsxs(Layout, { children: [_jsx(Onglets, { actif: t, onChange: setT, liste: [['actives', 'À livrer'], ['faites', 'Livrées']] }), !cmds ? _jsx(Chargement, {}) : !liste.length ? _jsx(Vide, { children: t === 'actives' ? 'Aucune commande assignée.' : 'Aucune livraison terminée.' }) : liste.map((o) => (_jsxs(CarteCommande, { o: o, children: [o.statut !== 'livree' && (_jsxs("div", { className: "actions", children: [_jsx("a", { className: "btn jaune", href: mapsLien(o.adresse, VILLE_DEFAUT), target: "_blank", rel: "noreferrer", children: "\uD83E\uDDED Itin\u00E9raire" }), o.statut === 'assignee' && _jsx("button", { className: "btn", onClick: () => demarrer(o), children: "D\u00E9marrer" }), o.statut === 'en_cours' && preuve !== o.id && _jsx("button", { className: "btn", onClick: () => setPreuve(o.id), children: "Livr\u00E9e" }), _jsx("a", { className: "btn gris-b", href: 'tel:' + o.telephone, children: "Appeler" })] })), preuve === o.id && _jsx(Preuve, { o: o, fermer: () => setPreuve(null) })] }, o.id)))] }));
}
