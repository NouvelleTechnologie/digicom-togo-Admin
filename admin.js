import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, limit, Timestamp, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db, creerCompteAuth } from './firebase.js';
import { useLive } from './hooks.js';
import { payerAbonnement, logAction } from './services.js';
import { ROLES, PLANS, MODES_ABO, COMMISSION_TAUX } from './config.js';
import { fcfa, dateFr, heureFr, parRecent, messageErreur } from './utils.js';
import Layout, { Onglets } from './layout.js';
import { Alerte, Chargement, Vide, CarteCommande } from './ui.js';
function FormAbo({ plan, setPlan, mode, setMode, ref_, setRef }) {
    return (_jsxs(_Fragment, { children: [_jsx("label", { children: "Dur\u00E9e de l'abonnement" }), _jsx("select", { value: plan, onChange: (e) => setPlan(e.target.value), children: Object.values(PLANS).map((p) => _jsxs("option", { value: p.mois, children: [p.label, " \u2014 ", fcfa(p.prix)] }, p.mois)) }), _jsxs("div", { className: "deux", children: [_jsxs("div", { children: [_jsx("label", { children: "Paiement re\u00E7u par" }), _jsx("select", { value: mode, onChange: (e) => setMode(e.target.value), children: Object.entries(MODES_ABO).map(([k, v]) => _jsx("option", { value: k, children: v }, k)) })] }), _jsxs("div", { children: [_jsx("label", { children: "R\u00E9f\u00E9rence" }), _jsx("input", { value: ref_, onChange: (e) => setRef(e.target.value), placeholder: "N\u00B0 transaction" })] })] })] }));
}
function Creer() {
    const [f, setF] = useState({ nom: '', tel: '', email: '', mdp: '', role: 'acheteur' });
    const [plan, setPlan] = useState('1');
    const [mode, setMode] = useState('moov');
    const [ref_, setRef] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState({ t: '', m: '' });
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    const creer = async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg({ t: '', m: '' });
        try {
            const email = f.email.trim().toLowerCase();
            const uid = await creerCompteAuth(email, f.mdp);
            await setDoc(doc(db, 'users', uid), {
                nom: f.nom.trim(), tel: f.tel.trim(), email, role: f.role, actif: true, createdAt: serverTimestamp(),
            });
            if (f.role === 'abonne')
                await payerAbonnement({ uid, nom: f.nom.trim(), mois: Number(plan), mode, reference: ref_ });
            logAction('Compte créé', `${email} (${ROLES[f.role]})`);
            setMsg({ t: 'ok', m: `Compte créé : ${email} (${ROLES[f.role]}). Transmets-lui son mot de passe.` });
            setF({ nom: '', tel: '', email: '', mdp: '', role: f.role });
            setRef('');
        }
        catch (x) {
            setMsg({ t: 'err', m: messageErreur(x) });
        }
        setBusy(false);
    };
    return (_jsxs("form", { className: "carte", onSubmit: creer, children: [_jsx("h2", { children: "Cr\u00E9er un compte" }), _jsx("label", { children: "Nom complet / boutique" }), _jsx("input", { value: f.nom, onChange: set('nom'), required: true }), _jsx("label", { children: "T\u00E9l\u00E9phone" }), _jsx("input", { type: "tel", value: f.tel, onChange: set('tel'), placeholder: "90 00 00 00" }), _jsx("label", { children: "Email (identifiant)" }), _jsx("input", { type: "email", value: f.email, onChange: set('email'), required: true }), _jsx("label", { children: "Mot de passe (6 caract\u00E8res min.)" }), _jsx("input", { type: "text", value: f.mdp, onChange: set('mdp'), minLength: 6, required: true }), _jsx("label", { children: "R\u00F4le" }), _jsx("select", { value: f.role, onChange: set('role'), children: Object.entries(ROLES).map(([k, v]) => _jsx("option", { value: k, children: v }, k)) }), f.role === 'abonne' && _jsx(FormAbo, { plan, setPlan, mode, setMode, ref_, setRef }), _jsx(Alerte, { type: msg.t, children: msg.m }), _jsx("button", { className: "btn plein-l", disabled: busy, children: busy ? 'Création…' : 'Créer le compte' })] }));
}
function Utilisateurs() {
    const users = useLive(() => collection(db, 'users'));
    const abos = useLive(() => collection(db, 'abonnements'));
    const [ouvert, setOuvert] = useState(null);
    const [plan, setPlan] = useState('1');
    const [mode, setMode] = useState('moov');
    const [ref_, setRef] = useState('');
    const [msg, setMsg] = useState({ t: '', m: '' });
    const [filtre, setFiltre] = useState('');
    if (!users || !abos)
        return _jsx(Chargement, {});
    const aboDe = (uid) => abos.find((a) => a.id === uid);
    const basculer = async (u) => {
        await updateDoc(doc(db, 'users', u.id), { actif: u.actif === false });
        logAction(u.actif === false ? 'Compte réactivé' : 'Compte désactivé', u.nom);
    };
    const renouveler = async (u) => {
        try {
            const fin = await payerAbonnement({ uid: u.id, nom: u.nom, mois: Number(plan), mode, reference: ref_ });
            logAction('Abonnement renouvelé', `${u.nom} → ${dateFr(fin)}`);
            setMsg({ t: 'ok', m: `${u.nom} : abonnement valable jusqu'au ${dateFr(fin)}.` });
            setOuvert(null);
            setRef('');
        }
        catch (x) {
            setMsg({ t: 'err', m: messageErreur(x) });
        }
    };
    const mdp = async (u) => {
        try {
            await sendPasswordResetEmail(auth, u.email);
            setMsg({ t: 'ok', m: 'Email de réinitialisation envoyé à ' + u.email });
        }
        catch (x) {
            setMsg({ t: 'err', m: messageErreur(x) });
        }
    };
    const liste = users.filter((u) => !filtre || u.role === filtre).sort(parRecent);
    return (_jsxs(_Fragment, { children: [_jsxs("select", { value: filtre, onChange: (e) => setFiltre(e.target.value), children: [_jsxs("option", { value: "", children: ["Tous les r\u00F4les (", users.length, ")"] }), Object.entries(ROLES).map(([k, v]) => _jsx("option", { value: k, children: v }, k))] }), _jsx(Alerte, { type: msg.t, children: msg.m }), !liste.length && _jsx(Vide, { children: "Aucun utilisateur." }), liste.map((u) => {
                const a = aboDe(u.id);
                const valide = a && a.actif !== false && a.dateFin.toMillis() > Date.now();
                return (_jsxs("div", { className: "carte", children: [_jsxs("div", { className: "ligne", children: [_jsx("b", { children: u.nom }), _jsx("span", { className: 'badge ' + (u.actif === false ? 'ko' : 'ok'), children: u.actif === false ? 'Désactivé' : 'Actif' })] }), _jsxs("small", { className: "gris", children: [ROLES[u.role], " \u00B7 ", u.email, u.tel ? ' · ' + u.tel : ''] }), u.role === 'abonne' && (_jsxs("p", { style: { marginTop: 6 }, children: ["Abonnement :", ' ', a ? _jsxs("span", { className: 'badge ' + (valide ? 'ok' : 'ko'), children: [valide ? 'valide' : 'expiré', " \u00B7 fin ", dateFr(a.dateFin)] }) : _jsx("span", { className: "badge ko", children: "aucun" })] })), _jsxs("div", { className: "actions", children: [_jsx("button", { className: "btn mini gris-b", onClick: () => basculer(u), children: u.actif === false ? 'Réactiver' : 'Désactiver' }), _jsx("button", { className: "btn mini gris-b", onClick: () => mdp(u), children: "Mot de passe" }), u.role === 'abonne' && _jsx("button", { className: "btn mini jaune", onClick: () => setOuvert(ouvert === u.id ? null : u.id), children: "Renouveler" })] }), ouvert === u.id && (_jsxs("div", { children: [_jsx(FormAbo, { plan, setPlan, mode, setMode, ref_, setRef }), _jsx("button", { className: "btn mini", style: { marginTop: 10 }, onClick: () => renouveler(u), children: "Valider le paiement" })] }))] }, u.id));
            })] }));
}
function Commandes() {
    const cmds = useLive(() => collection(db, 'commandes'));
    if (!cmds)
        return _jsx(Chargement, {});
    if (!cmds.length)
        return _jsx(Vide, { children: "Aucune commande." });
    return cmds.sort(parRecent).map((o) => _jsx(CarteCommande, { o: o }, o.id));
}
// Validation des produits avant publication
function Produits() {
    const ps = useLive(() => collection(db, 'produits'));
    const [filtre, setFiltre] = useState('en_attente');
    const [motif, setMotif] = useState({});
    if (!ps)
        return _jsx(Chargement, {});
    const st = (p) => p.statut || 'valide';
    const nb = ps.filter((p) => st(p) === 'en_attente').length;
    const liste = ps.filter((p) => (filtre ? st(p) === filtre : true)).sort(parRecent);
    const decider = async (p, statut) => {
        await updateDoc(doc(db, 'produits', p.id), { statut, motif: statut === 'refuse' ? (motif[p.id] || '').trim() : '' });
        logAction(statut === 'valide' ? 'Produit validé' : 'Produit refusé', `${p.nom} (${p.abonneNom})`);
    };
    const masquer = (p) => updateDoc(doc(db, 'produits', p.id), { actif: p.actif === false });
    const suppr = async (p) => { if (window.confirm('Supprimer ' + p.nom + ' ?')) {
        await deleteDoc(doc(db, 'produits', p.id));
        logAction('Produit supprimé', p.nom);
    } };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "chips", children: [['en_attente', `À valider (${nb})`], ['valide', 'Validés'], ['refuse', 'Refusés'], ['', 'Tous']].map(([k, l]) => (_jsx("button", { className: filtre === k ? 'on' : '', onClick: () => setFiltre(k), children: l }, k))) }), !liste.length && _jsx(Vide, { children: "Aucun produit dans cette liste." }), liste.map((p) => (_jsxs("div", { className: "carte", children: [_jsxs("div", { className: "item", children: [_jsx("img", { src: p.images?.[0]?.url, alt: "" }), _jsxs("div", { children: [_jsx("b", { children: p.nom }), " ", p.actif === false && _jsx("span", { className: "badge ko", children: "masqu\u00E9" }), _jsx("br", {}), _jsxs("small", { className: "gris", children: [p.abonneNom, " \u00B7 ", fcfa(p.prix), p.prixPromo > 0 ? ' (promo ' + fcfa(p.prixPromo) + ')' : '', " \u00B7 stock ", p.stock] })] })] }), p.description && _jsx("p", { style: { margin: '8px 0' }, children: p.description }), _jsxs("details", { children: [_jsxs("summary", { children: ["Photos (", p.images?.length || 0, ")"] }), _jsx("div", { className: "photos", children: (p.images || []).map((im, i) => _jsx("img", { src: im.url, alt: "" }, i)) })] }), st(p) === 'en_attente' && (_jsxs(_Fragment, { children: [_jsx("label", { children: "Motif du refus (si refus)" }), _jsx("input", { value: motif[p.id] || '', onChange: (e) => setMotif({ ...motif, [p.id]: e.target.value }), placeholder: "Ex. photo floue" }), _jsxs("div", { className: "actions", children: [_jsx("button", { className: "btn", onClick: () => decider(p, 'valide'), children: "\u2714 Valider" }), _jsx("button", { className: "btn rouge", onClick: () => decider(p, 'refuse'), children: "\u2716 Refuser" })] })] })), st(p) !== 'en_attente' && (_jsxs("div", { className: "actions", children: [_jsx("button", { className: "btn mini gris-b", onClick: () => masquer(p), children: p.actif === false ? 'Afficher' : 'Masquer' }), st(p) === 'refuse' && _jsx("button", { className: "btn mini gris-b", onClick: () => decider(p, 'valide'), children: "Valider quand m\u00EAme" }), _jsx("button", { className: "btn mini rouge", onClick: () => suppr(p), children: "Supprimer" })] }))] }, p.id)))] }));
}
function Promos() {
    const promos = useLive(() => collection(db, 'promos'));
    const vide = { code: '', type: 'pourcent', valeur: '', min: '', fin: '' };
    const [f, setF] = useState(vide);
    const [msg, setMsg] = useState({ t: '', m: '' });
    if (!promos)
        return _jsx(Chargement, {});
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    const creer = async (e) => {
        e.preventDefault();
        const code = f.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (!code || !Number(f.valeur))
            return setMsg({ t: 'err', m: 'Code et valeur obligatoires.' });
        if (f.type === 'pourcent' && Number(f.valeur) > 90)
            return setMsg({ t: 'err', m: 'Un pourcentage doit être inférieur à 90.' });
        try {
            await setDoc(doc(db, 'promos', code), {
                code, type: f.type, valeur: Number(f.valeur), min: Number(f.min) || 0,
                fin: f.fin ? Timestamp.fromDate(new Date(f.fin + 'T23:59:59')) : null, actif: true, createdAt: serverTimestamp(),
            });
            logAction('Code promo créé', code);
            setMsg({ t: 'ok', m: 'Code ' + code + ' créé.' });
            setF(vide);
        }
        catch (x) {
            setMsg({ t: 'err', m: messageErreur(x) });
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("form", { className: "carte", onSubmit: creer, children: [_jsx("h2", { children: "Nouveau code promo" }), _jsx("label", { children: "Code (lettres et chiffres)" }), _jsx("input", { value: f.code, onChange: set('code'), placeholder: "BIENVENUE", required: true }), _jsxs("div", { className: "deux", children: [_jsxs("div", { children: [_jsx("label", { children: "Type" }), _jsxs("select", { value: f.type, onChange: set('type'), children: [_jsx("option", { value: "pourcent", children: "Pourcentage (%)" }), _jsx("option", { value: "montant", children: "Montant fixe (F)" })] })] }), _jsxs("div", { children: [_jsx("label", { children: "Valeur" }), _jsx("input", { type: "number", min: "1", value: f.valeur, onChange: set('valeur'), required: true })] })] }), _jsxs("div", { className: "deux", children: [_jsxs("div", { children: [_jsx("label", { children: "Panier minimum (F)" }), _jsx("input", { type: "number", min: "0", value: f.min, onChange: set('min') })] }), _jsxs("div", { children: [_jsx("label", { children: "Valable jusqu'au" }), _jsx("input", { type: "date", value: f.fin, onChange: set('fin') })] })] }), _jsx(Alerte, { type: msg.t, children: msg.m }), _jsx("button", { className: "btn plein-l", children: "Cr\u00E9er le code" })] }), promos.map((p) => (_jsxs("div", { className: "carte ligne", children: [_jsxs("span", { children: [_jsx("b", { children: p.code }), " ", _jsx("span", { className: 'badge ' + (p.actif === false ? 'ko' : 'ok'), children: p.actif === false ? 'inactif' : 'actif' }), _jsx("br", {}), _jsxs("small", { className: "gris", children: [p.type === 'pourcent' ? p.valeur + ' %' : fcfa(p.valeur), p.min ? ' · dès ' + fcfa(p.min) : '', p.fin ? ' · jusqu\'au ' + dateFr(p.fin) : ''] })] }), _jsxs("span", { className: "actions", style: { marginTop: 0 }, children: [_jsx("button", { className: "btn mini gris-b", onClick: () => updateDoc(doc(db, 'promos', p.id), { actif: p.actif === false }), children: p.actif === false ? 'Activer' : 'Désactiver' }), _jsx("button", { className: "btn mini rouge", onClick: () => window.confirm('Supprimer ?') && deleteDoc(doc(db, 'promos', p.id)), children: "\u2715" })] })] }, p.id)))] }));
}
function Commissions() {
    const cmds = useLive(() => collection(db, 'commandes'));
    const users = useLive(() => collection(db, 'users'));
    const rev = useLive(() => collection(db, 'reversements'));
    const [ouvert, setOuvert] = useState(null);
    const [f, setF] = useState({ montant: '', ref: '' });
    const [msg, setMsg] = useState('');
    if (!cmds || !users || !rev)
        return _jsx(Chargement, {});
    const ventes = {};
    cmds.filter((o) => o.statut === 'livree').forEach((o) => o.items.forEach((i) => { ventes[i.abonneId] = (ventes[i.abonneId] || 0) + i.prix * i.qte; }));
    const lignes = users.filter((u) => u.role === 'abonne').map((u) => {
        const v = ventes[u.id] || 0;
        const due = Math.round((v * COMMISSION_TAUX) / 100);
        const paye = rev.filter((r) => r.abonneId === u.id).reduce((s, r) => s + r.montant, 0);
        return { u, v, due, paye, reste: due - paye };
    }).sort((a, b) => b.reste - a.reste);
    const totalReste = lignes.reduce((s, l) => s + Math.max(0, l.reste), 0);
    const reverser = async (l) => {
        const m = Number(f.montant);
        if (!m)
            return;
        await addDoc(collection(db, 'reversements'), { abonneId: l.u.id, abonneNom: l.u.nom, montant: m, ref: f.ref.trim(), date: serverTimestamp() });
        logAction('Reversement enregistré', `${l.u.nom} : ${fcfa(m)}`);
        setMsg(`Reversement de ${fcfa(m)} enregistré pour ${l.u.nom}.`);
        setOuvert(null);
        setF({ montant: '', ref: '' });
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "kpis", children: _jsxs("div", { className: "kpi r", children: [_jsx("b", { children: fcfa(totalReste) }), _jsxs("small", { children: ["Commissions \u00E0 encaisser (", COMMISSION_TAUX, " %)"] })] }) }), _jsx(Alerte, { type: "ok", children: msg }), !lignes.length && _jsx(Vide, { children: "Aucun abonn\u00E9." }), lignes.map((l) => (_jsxs("div", { className: "carte", children: [_jsxs("div", { className: "ligne", children: [_jsx("b", { children: l.u.nom }), _jsx("b", { children: fcfa(Math.max(0, l.reste)) })] }), _jsxs("small", { className: "gris", children: ["Ventes livr\u00E9es ", fcfa(l.v), " \u00B7 commission ", fcfa(l.due), " \u00B7 revers\u00E9 ", fcfa(l.paye)] }), _jsx("div", { className: "actions", children: _jsx("button", { className: "btn mini jaune", onClick: () => setOuvert(ouvert === l.u.id ? null : l.u.id), children: "Enregistrer un reversement" }) }), ouvert === l.u.id && (_jsxs("div", { children: [_jsxs("div", { className: "deux", children: [_jsxs("div", { children: [_jsx("label", { children: "Montant re\u00E7u (F)" }), _jsx("input", { type: "number", min: "1", value: f.montant, onChange: (e) => setF({ ...f, montant: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { children: "R\u00E9f\u00E9rence" }), _jsx("input", { value: f.ref, onChange: (e) => setF({ ...f, ref: e.target.value }) })] })] }), _jsx("button", { className: "btn mini", style: { marginTop: 8 }, onClick: () => reverser(l), children: "Valider" })] }))] }, l.u.id)))] }));
}
function Journal() {
    const lignes = useLive(() => query(collection(db, 'journal'), orderBy('date', 'desc'), limit(100)));
    if (!lignes)
        return _jsx(Chargement, {});
    if (!lignes.length)
        return _jsx(Vide, { children: "Le journal est vide." });
    return lignes.map((j) => (_jsxs("div", { className: "carte", children: [_jsxs("div", { className: "ligne", children: [_jsx("b", { children: j.action }), _jsx("small", { className: "gris", children: heureFr(j.date) })] }), _jsxs("small", { className: "gris", children: [j.acteurNom, " (", ROLES[j.role] || j.role, ")", j.detail ? ' · ' + j.detail : ''] })] }, j.id)));
}
export default function Admin() {
    const [t, setT] = useState('users');
    const liste = [['users', 'Utilisateurs'], ['creer', '+ Créer'], ['prod', 'Produits'], ['cmd', 'Commandes'], ['promos', 'Promos'], ['comm', 'Commissions'], ['journal', 'Journal']];
    return (_jsxs(Layout, { children: [_jsx(Onglets, { actif: t, onChange: setT, liste: liste }), t === 'users' && _jsx(Utilisateurs, {}), t === 'creer' && _jsx(Creer, {}), t === 'prod' && _jsx(Produits, {}), t === 'cmd' && _jsx(Commandes, {}), t === 'promos' && _jsx(Promos, {}), t === 'comm' && _jsx(Commissions, {}), t === 'journal' && _jsx(Journal, {})] }));
}
