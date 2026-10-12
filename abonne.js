import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { collection, doc, query, where, addDoc, updateDoc, deleteDoc, setDoc, getDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { useEffect } from 'react';
import { db } from './firebase.js';
import { useAuth } from './authcontext.js';
import { useLive } from './hooks.js';
import { CATEGORIES, STOCKAGE_PHOTOS, CLOUDINARY, COMMISSION_TAUX, STOCK_BAS } from './config.js';
import { logAction } from './services.js';
import { fcfa, dateFr, parRecent, compresserImage, lireDataUrl, messageErreur } from './utils.js';
import Layout, { Onglets } from './layout.js';
import { Alerte, Chargement, Vide, CarteCommande } from './ui.js';
const MAX_PHOTOS = 4;
function FormProduit({ initial, onDone }) {
    const { profile, abo } = useAuth();
    const [f, setF] = useState({
        nom: initial?.nom || '', description: initial?.description || '', prix: initial?.prix ?? '',
        stock: initial?.stock ?? '', categorie: initial?.categorie || CATEGORIES[0],
        prixPromo: initial?.prixPromo || '',
        promoFin: initial?.promoFin ? initial.promoFin.toDate().toISOString().slice(0, 10) : '',
    });
    const [anciennes, setAnciennes] = useState(initial?.images || []);
    const [retirees, setRetirees] = useState([]);
    const [nouvelles, setNouvelles] = useState([]); // {file, url}
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    const choisir = (e) => {
        const fichiers = Array.from(e.target.files || []);
        const place = MAX_PHOTOS - anciennes.length - nouvelles.length;
        setNouvelles([...nouvelles, ...fichiers.slice(0, place).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
        e.target.value = '';
    };
    const enregistrer = async (e) => {
        e.preventDefault();
        if (!anciennes.length && !nouvelles.length)
            return setErr('Ajoute au moins une photo.');
        setBusy(true);
        setErr('');
        try {
            const ajoutees = [];
            for (const n of nouvelles) {
                if (STOCKAGE_PHOTOS === 'cloudinary') {
                    const blob = await compresserImage(n.file);
                    const fd = new FormData();
                    fd.append('file', blob);
                    fd.append('upload_preset', CLOUDINARY.uploadPreset);
                    fd.append('folder', 'digicom');
                    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`, { method: 'POST', body: fd });
                    const j = await r.json();
                    if (!r.ok)
                        throw new Error(j.error?.message || "Envoi de la photo impossible.");
                    ajoutees.push({ url: j.secure_url, path: j.public_id });
                }
                else {
                    const blob = await compresserImage(n.file, 700, 0.65);
                    ajoutees.push({ url: await lireDataUrl(blob), path: '' });
                }
            }
            const toutes = [...anciennes, ...ajoutees];
            if (STOCKAGE_PHOTOS === 'firestore' && JSON.stringify(toutes).length > 900000)
                throw new Error('Photos trop lourdes : retire une ou deux photos.');
            if (f.prixPromo && Number(f.prixPromo) >= Number(f.prix))
                throw new Error('Le prix promo doit être inférieur au prix normal.');
            const data = {
                prixPromo: Number(f.prixPromo) || 0,
                promoFin: f.promoFin ? Timestamp.fromDate(new Date(f.promoFin + 'T23:59:59')) : null,
                nom: f.nom.trim(), description: f.description.trim(), prix: Number(f.prix), stock: Number(f.stock),
                categorie: f.categorie, images: toutes, updatedAt: serverTimestamp(),
            };
            const change = initial && (f.nom.trim() !== initial.nom || f.description.trim() !== (initial.description || '') || JSON.stringify(toutes.map((i) => i.url)) !== JSON.stringify((initial.images || []).map((i) => i.url)));
            if (initial)
                await updateDoc(doc(db, 'produits', initial.id), change ? { ...data, statut: 'en_attente', motif: '' } : data);
            else
                await addDoc(collection(db, 'produits'), {
                    ...data, statut: 'en_attente', actif: true, vendus: 0, abonneId: profile.uid, abonneNom: profile.nom,
                    abonneFin: Timestamp.fromDate(abo.fin), createdAt: serverTimestamp(),
                });
            logAction(initial ? 'Produit modifié' : 'Produit soumis', f.nom.trim());
            onDone();
        }
        catch (x) {
            setErr(messageErreur(x));
        }
        setBusy(false);
    };
    return (_jsxs("form", { className: "carte", onSubmit: enregistrer, children: [_jsx("h2", { children: initial ? 'Modifier le produit' : 'Nouveau produit' }), _jsx("label", { children: "Nom du produit" }), _jsx("input", { value: f.nom, onChange: set('nom'), required: true }), _jsx("label", { children: "Description" }), _jsx("textarea", { value: f.description, onChange: set('description') }), _jsxs("div", { className: "deux", children: [_jsxs("div", { children: [_jsx("label", { children: "Prix (F)" }), _jsx("input", { type: "number", min: "0", inputMode: "numeric", value: f.prix, onChange: set('prix'), required: true })] }), _jsxs("div", { children: [_jsx("label", { children: "Stock" }), _jsx("input", { type: "number", min: "0", inputMode: "numeric", value: f.stock, onChange: set('stock'), required: true })] })] }), _jsxs("div", { className: "deux", children: [_jsxs("div", { children: [_jsx("label", { children: "Prix promo (F) \u2014 optionnel" }), _jsx("input", { type: "number", min: "0", inputMode: "numeric", value: f.prixPromo, onChange: set('prixPromo') })] }), _jsxs("div", { children: [_jsx("label", { children: "Promo jusqu'au" }), _jsx("input", { type: "date", value: f.promoFin, onChange: set('promoFin') })] })] }), _jsx("label", { children: "Cat\u00E9gorie" }), _jsx("select", { value: f.categorie, onChange: set('categorie'), children: CATEGORIES.map((c) => _jsx("option", { children: c }, c)) }), _jsxs("label", { children: ["Photos (", anciennes.length + nouvelles.length, "/", MAX_PHOTOS, ") \u2014 la 1re est la photo principale"] }), _jsxs("div", { className: "photos", children: [anciennes.map((im, i) => (_jsxs("div", { className: "ph", children: [_jsx("img", { src: im.url, alt: "" }), _jsx("button", { type: "button", className: "x", onClick: () => { setAnciennes(anciennes.filter((_, k) => k !== i)); setRetirees([...retirees, im]); }, children: "\u00D7" })] }, i))), nouvelles.map((n, i) => (_jsxs("div", { className: "ph", children: [_jsx("img", { src: n.url, alt: "" }), _jsx("button", { type: "button", className: "x", onClick: () => setNouvelles(nouvelles.filter((_, k) => k !== i)), children: "\u00D7" })] }, n.url)))] }), anciennes.length + nouvelles.length < MAX_PHOTOS && _jsx("input", { type: "file", accept: "image/*", multiple: true, onChange: choisir }), _jsx(Alerte, { children: err }), _jsx("button", { className: "btn plein-l", disabled: busy, children: busy ? 'Envoi des photos…' : 'Enregistrer' }), _jsx("button", { type: "button", className: "btn plein-l gris-b", onClick: onDone, disabled: busy, children: "Annuler" })] }));
}
function MesProduits() {
    const { profile } = useAuth();
    const ps = useLive(() => query(collection(db, 'produits'), where('abonneId', '==', profile.uid)), [profile.uid]);
    const [edit, setEdit] = useState(null); // null | 'new' | produit
    if (!ps)
        return _jsx(Chargement, {});
    if (edit)
        return _jsx(FormProduit, { initial: edit === 'new' ? null : edit, onDone: () => setEdit(null) });
    const suppr = async (p) => {
        if (!window.confirm('Supprimer « ' + p.nom + ' » ?'))
            return;
        await deleteDoc(doc(db, 'produits', p.id));
    };
    return (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn plein-l", style: { marginTop: 0, marginBottom: 12 }, onClick: () => setEdit('new'), children: "+ Ajouter un produit" }), ps.filter((p) => p.stock <= STOCK_BAS).length > 0 && _jsxs(Alerte, { type: "info", children: ["\u26A0\uFE0F ", ps.filter((p) => p.stock <= STOCK_BAS).length, " produit(s) en stock bas ou en rupture : pense \u00E0 r\u00E9approvisionner."] }), !ps.length && _jsx(Vide, { children: "Aucun produit. Ajoute le premier : il sera visible apr\u00E8s validation par l'administration." }), ps.sort(parRecent).map((p) => (_jsxs("div", { className: "carte item", children: [_jsx("img", { src: p.images?.[0]?.url, alt: "" }), _jsxs("div", { children: [_jsx("b", { children: p.nom }), " ", p.actif === false && _jsx("span", { className: "badge ko", children: "masqu\u00E9" }), (p.statut || 'valide') === 'en_attente' && _jsx("span", { className: "badge en_attente", children: "En attente de validation" }), p.statut === 'refuse' && _jsxs("span", { className: "badge ko", children: ["Refus\u00E9", p.motif ? ' : ' + p.motif : ''] }), p.stock <= STOCK_BAS && _jsx("span", { className: "badge ko", children: p.stock <= 0 ? 'Rupture' : 'Stock bas' }), _jsx("br", {}), _jsx("span", { className: "prix", children: fcfa(p.prix) }), " ", _jsxs("small", { className: "gris", children: ["\u00B7 stock ", p.stock, " \u00B7 vendus ", p.vendus || 0] }), _jsxs("div", { className: "actions", children: [_jsx("button", { className: "btn mini gris-b", onClick: () => setEdit(p), children: "Modifier" }), _jsx("button", { className: "btn mini gris-b", onClick: () => updateDoc(doc(db, 'produits', p.id), { actif: p.actif === false }), children: p.actif === false ? 'Afficher' : 'Masquer' }), _jsx("button", { className: "btn mini rouge", onClick: () => suppr(p), children: "Supprimer" })] })] })] }, p.id)))] }));
}
function MesCommandes() {
    const { profile } = useAuth();
    const cmds = useLive(() => query(collection(db, 'commandes'), where('abonneIds', 'array-contains', profile.uid)), [profile.uid]);
    if (!cmds)
        return _jsx(Chargement, {});
    if (!cmds.length)
        return _jsx(Vide, { children: "Aucune commande pour le moment." });
    return cmds.sort(parRecent).map((o) => _jsx(CarteCommande, { o: o, filtreAbonne: profile.uid }, o.id));
}
function Ventes() {
    const { profile } = useAuth();
    const cmds = useLive(() => query(collection(db, 'commandes'), where('abonneIds', 'array-contains', profile.uid)), [profile.uid]);
    const rev = useLive(() => query(collection(db, 'reversements'), where('abonneId', '==', profile.uid)), [profile.uid]);
    const ps = useLive(() => query(collection(db, 'produits'), where('abonneId', '==', profile.uid)), [profile.uid]);
    if (!cmds || !rev || !ps)
        return _jsx(Chargement, {});
    const par = {};
    let ca = 0;
    cmds.filter((o) => o.statut === 'livree').forEach((o) => o.items.filter((i) => i.abonneId === profile.uid).forEach((i) => {
        par[i.id] = par[i.id] || { nom: i.nom, qte: 0, ca: 0 };
        par[i.id].qte += i.qte;
        par[i.id].ca += i.prix * i.qte;
        ca += i.prix * i.qte;
    }));
    const due = Math.round((ca * COMMISSION_TAUX) / 100);
    const verse = rev.reduce((s, r) => s + r.montant, 0);
    const lignes = Object.entries(par).sort((a, b) => b[1].ca - a[1].ca);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "kpis", children: [_jsxs("div", { className: "kpi", children: [_jsx("b", { children: fcfa(ca) }), _jsx("small", { children: "Ventes livr\u00E9es" })] }), _jsxs("div", { className: "kpi j", children: [_jsx("b", { children: fcfa(ca - due) }), _jsx("small", { children: "Ton net apr\u00E8s commission" })] }), _jsxs("div", { className: "kpi r", children: [_jsx("b", { children: fcfa(Math.max(0, due - verse)) }), _jsxs("small", { children: ["Commission \u00E0 reverser (", COMMISSION_TAUX, " %)"] })] }), _jsxs("div", { className: "kpi", children: [_jsx("b", { children: fcfa(verse) }), _jsx("small", { children: "D\u00E9j\u00E0 revers\u00E9" })] })] }), _jsx("h3", { children: "Ventes par produit" }), !lignes.length && _jsx(Vide, { children: "Aucune vente livr\u00E9e pour le moment." }), lignes.map(([id, v]) => {
                const p = ps.find((x) => x.id === id);
                return (_jsxs("div", { className: "carte ligne", children: [_jsxs("span", { children: [_jsx("b", { children: v.nom }), _jsx("br", {}), _jsxs("small", { className: "gris", children: [v.qte, " vendu", v.qte > 1 ? 's' : '', p ? ' · stock ' + p.stock : ''] })] }), _jsx("b", { children: fcfa(v.ca) })] }, id));
            })] }));
}
function Boutique() {
    const { profile } = useAuth();
    const [f, setF] = useState({ moov: '', mixx: '', whatsapp: '' });
    const [ok, setOk] = useState(false);
    useEffect(() => {
        getDoc(doc(db, 'boutiques', profile.uid)).then((s) => s.exists() && setF({ moov: s.data().moov || '', mixx: s.data().mixx || '', whatsapp: s.data().whatsapp || '' }));
    }, [profile.uid]);
    const sauver = async (e) => {
        e.preventDefault();
        await setDoc(doc(db, 'boutiques', profile.uid), { nom: profile.nom, moov: f.moov.trim(), mixx: f.mixx.trim(), whatsapp: f.whatsapp.trim() });
        setOk(true);
    };
    return (_jsxs("form", { className: "carte", onSubmit: sauver, children: [_jsx("h2", { children: "Mes num\u00E9ros de paiement" }), _jsx("p", { className: "gris", children: "Ces num\u00E9ros sont montr\u00E9s aux acheteurs pour qu'ils te paient directement." }), _jsx("label", { children: "Num\u00E9ro Moov Money" }), _jsx("input", { type: "tel", value: f.moov, onChange: (e) => { setF({ ...f, moov: e.target.value }); setOk(false); } }), _jsx("label", { children: "Num\u00E9ro Mixx by Yas" }), _jsx("input", { type: "tel", value: f.mixx, onChange: (e) => { setF({ ...f, mixx: e.target.value }); setOk(false); } }), _jsx("label", { children: "Num\u00E9ro WhatsApp (pour que tes acheteurs te contactent)" }), _jsx("input", { type: "tel", value: f.whatsapp, onChange: (e) => { setF({ ...f, whatsapp: e.target.value }); setOk(false); } }), _jsxs("p", { className: "gris", style: { marginTop: 8 }, children: ["Commission DigiCom : ", COMMISSION_TAUX, " % des ventes livr\u00E9es."] }), _jsx(Alerte, { type: "ok", children: ok ? 'Numéros enregistrés.' : '' }), _jsx("button", { className: "btn plein-l", children: "Enregistrer" })] }));
}
export default function Abonne() {
    const { abo } = useAuth();
    const [t, setT] = useState('prod');
    const jours = abo?.fin ? Math.ceil((abo.fin - Date.now()) / 86400000) : 0;
    if (!abo?.actif)
        return (_jsx(Layout, { children: _jsxs("div", { className: "carte", children: [_jsx("h2", { children: "Abonnement expir\u00E9 ou inactif" }), _jsx("p", { children: abo?.fin ? `Ton abonnement s'est terminé le ${dateFr(abo.fin)}.` : "Aucun abonnement n'est enregistré sur ton compte." }), _jsx("p", { className: "alerte info", children: "Tes produits ne sont plus visibles par les acheteurs. Contacte l'administration pour renouveler (1 mois : 5 000 F \u00B7 6 mois : 24 000 F \u00B7 12 mois : 42 000 F)." })] }) }));
    return (_jsxs(Layout, { children: [_jsxs(Alerte, { type: jours <= 7 ? 'info' : 'ok', children: ["Abonnement valide jusqu'au ", dateFr(abo.fin), " (", jours, " jour", jours > 1 ? 's' : '', " restant", jours > 1 ? 's' : '', ")."] }), _jsx(Onglets, { actif: t, onChange: setT, liste: [['prod', 'Mes produits'], ['cmd', 'Commandes'], ['ventes', 'Ventes'], ['pay', 'Paiement']] }), t === 'prod' && _jsx(MesProduits, {}), t === 'cmd' && _jsx(MesCommandes, {}), t === 'ventes' && _jsx(Ventes, {}), t === 'pay' && _jsx(Boutique, {})] }));
}
