import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { collection } from 'firebase/firestore';
import { db } from './firebase.js';
import { useLive } from './hooks.js';
import { fcfa, ms, toDate } from './utils.js';
import { ROLES, STATUTS, COMMISSION_TAUX } from './config.js';
import Layout from './layout.js';
import { Chargement } from './ui.js';
const K = ({ v, l, c = '' }) => _jsxs("div", { className: 'kpi ' + c, children: [_jsx("b", { children: v }), _jsx("small", { children: l })] });
export default function Stats() {
    const cmds = useLive(() => collection(db, 'commandes'));
    const abos = useLive(() => collection(db, 'abonnements'));
    const pays = useLive(() => collection(db, 'paiementsAbo'));
    const users = useLive(() => collection(db, 'users'));
    const prods = useLive(() => collection(db, 'produits'));
    const rev = useLive(() => collection(db, 'reversements'));
    if (!cmds || !abos || !pays || !users || !prods || !rev)
        return _jsx(Layout, { children: _jsx(Chargement, {}) });
    const livrees = cmds.filter((o) => o.statut === 'livree');
    const ca = livrees.reduce((s, o) => s + o.total, 0);
    const enCours = cmds.filter((o) => o.statut !== 'livree').reduce((s, o) => s + o.total, 0);
    const vendus = livrees.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qte, 0), 0);
    const ventesBrutes = livrees.reduce((s, o) => s + o.items.reduce((n, i) => n + i.prix * i.qte, 0), 0);
    const commDue = Math.round((ventesBrutes * COMMISSION_TAUX) / 100);
    const commVerse = rev.reduce((s, r) => s + r.montant, 0);
    const caAbo = pays.reduce((s, p) => s + p.prix, 0);
    const actifs = abos.filter((a) => a.actif !== false && ms(a.dateFin) > Date.now()).length;
    const expires = abos.length - actifs;
    // Top produits (commandes livrées)
    const top = {};
    livrees.forEach((o) => o.items.forEach((i) => { top[i.nom] = (top[i.nom] || 0) + i.qte; }));
    const topListe = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);
    // Ventes des 7 derniers jours
    const jours = [...Array(7)].map((_, k) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - k)); return d; });
    const parJour = jours.map((d) => livrees.filter((o) => { const x = toDate(o.livreeAt || o.createdAt); return x && x.toDateString() === d.toDateString(); }).reduce((s, o) => s + o.total, 0));
    const max = Math.max(1, ...parJour);
    const parRole = {};
    users.forEach((u) => { parRole[u.role] = (parRole[u.role] || 0) + 1; });
    return (_jsxs(Layout, { children: [_jsx("h2", { children: "Tableau de bord" }), _jsxs("div", { className: "kpis", children: [_jsx(K, { v: fcfa(ca), l: "Chiffre d'affaires (livr\u00E9)" }), _jsx(K, { v: fcfa(caAbo), l: "Revenus abonnements", c: "j" }), _jsx(K, { v: fcfa(ca + caAbo), l: "Total cumul\u00E9" }), _jsx(K, { v: fcfa(enCours), l: "Commandes \u00E0 encaisser", c: "r" }), _jsx(K, { v: fcfa(commDue), l: `Commissions générées (${COMMISSION_TAUX} %)`, c: "j" }), _jsx(K, { v: fcfa(Math.max(0, commDue - commVerse)), l: "Commissions \u00E0 encaisser", c: "r" }), _jsx(K, { v: actifs, l: "Abonn\u00E9s actifs" }), _jsx(K, { v: expires, l: "Abonn\u00E9s expir\u00E9s", c: "r" }), _jsx(K, { v: vendus, l: "Produits vendus", c: "j" }), _jsx(K, { v: prods.length, l: "Produits en ligne" })] }), _jsxs("div", { className: "carte", children: [_jsx("h3", { children: "Ventes \u2014 7 derniers jours" }), _jsx("div", { className: "barres", children: parJour.map((v, k) => (_jsxs("div", { children: [_jsx("i", { style: { height: (v / max) * 90 + '%' } }), _jsx("span", { children: jours[k].toLocaleDateString('fr-FR', { weekday: 'short' }) })] }, k))) })] }), _jsxs("div", { className: "carte", children: [_jsx("h3", { children: "Commandes par statut" }), Object.entries(STATUTS).map(([k, v]) => (_jsxs("div", { className: "ligne", children: [_jsx("span", { children: v }), _jsx("b", { children: cmds.filter((o) => o.statut === k).length })] }, k)))] }), _jsxs("div", { className: "carte", children: [_jsx("h3", { children: "Produits les plus vendus" }), !topListe.length && _jsx("small", { className: "gris", children: "Pas encore de vente livr\u00E9e." }), topListe.map(([n, q]) => _jsxs("div", { className: "ligne", children: [_jsx("span", { children: n }), _jsx("b", { children: q })] }, n))] }), _jsxs("div", { className: "carte", children: [_jsx("h3", { children: "Utilisateurs" }), Object.entries(ROLES).map(([k, v]) => _jsxs("div", { className: "ligne", children: [_jsx("span", { children: v }), _jsx("b", { children: parRole[k] || 0 })] }, k))] })] }));
}
