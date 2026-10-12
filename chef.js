import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { collection, doc, query, where, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { useLive } from './hooks.js';
import { STATUTS } from './config.js';
import { parRecent } from './utils.js';
import { logAction } from './services.js';
import Layout, { Onglets } from './layout.js';
import { Alerte, Chargement, Vide, CarteCommande } from './ui.js';
const quartierDe = (o) => (o.quartier || '').trim() || 'Non précisé';
export default function Chef() {
    const cmds = useLive(() => collection(db, 'commandes'));
    const livreurs = useLive(() => query(collection(db, 'users'), where('role', '==', 'livreur')));
    const [t, setT] = useState('repartir');
    const [choix, setChoix] = useState({});
    const [msg, setMsg] = useState('');
    if (!cmds || !livreurs)
        return _jsx(Layout, { children: _jsx(Chargement, {}) });
    const actifs = livreurs.filter((l) => l.actif !== false);
    const assigner = async (liste, uid) => {
        const l = livreurs.find((x) => x.id === uid);
        if (!l || !liste.length)
            return;
        const b = writeBatch(db);
        liste.forEach((o) => b.update(doc(db, 'commandes', o.id), {
            livreurId: l.id, livreurNom: l.nom, statut: o.statut === 'en_attente' ? 'assignee' : o.statut, updatedAt: serverTimestamp(),
        }));
        await b.commit();
        logAction('Commandes assignées', `${liste.length} → ${l.nom}`);
        setMsg(`${liste.length} commande(s) assignée(s) à ${l.nom}.`);
    };
    const enAttente = cmds.filter((o) => o.statut === 'en_attente').sort(parRecent);
    const groupes = {};
    enAttente.forEach((o) => { const k = quartierDe(o).toLowerCase(); (groupes[k] = groupes[k] || { nom: quartierDe(o), l: [] }).l.push(o); });
    const suivi = cmds.filter((o) => o.statut !== 'en_attente').sort(parRecent);
    const nb = (s) => cmds.filter((o) => o.statut === s).length;
    const Choisir = ({ cle, liste, label }) => (_jsxs(_Fragment, { children: [_jsxs("select", { value: choix[cle] || '', onChange: (e) => setChoix({ ...choix, [cle]: e.target.value }), children: [_jsx("option", { value: "", disabled: true, children: "Choisir un livreur\u2026" }), actifs.map((l) => _jsx("option", { value: l.id, children: l.nom }, l.id))] }), _jsx("button", { className: "btn mini", style: { marginTop: 8 }, disabled: !choix[cle], onClick: () => assigner(liste, choix[cle]), children: label })] }));
    return (_jsxs(Layout, { children: [_jsx("div", { className: "kpis", children: Object.entries(STATUTS).map(([k, v]) => _jsxs("div", { className: "kpi", children: [_jsx("b", { children: nb(k) }), _jsx("small", { children: v })] }, k)) }), !actifs.length && _jsx(Alerte, { type: "info", children: "Aucun livreur actif : l'admin doit en cr\u00E9er un." }), _jsx(Alerte, { type: "ok", children: msg }), _jsx(Onglets, { actif: t, onChange: setT, liste: [['repartir', `À répartir (${enAttente.length})`], ['suivi', 'Suivi']] }), t === 'repartir' && (!enAttente.length ? _jsx(Vide, { children: "Aucune commande en attente. \uD83D\uDC4D" }) : Object.entries(groupes).sort((a, b) => b[1].l.length - a[1].l.length).map(([k, g]) => (_jsxs("div", { className: "carte", children: [_jsxs("div", { className: "ligne", children: [_jsxs("b", { children: ["\uD83D\uDCCD ", g.nom] }), _jsxs("span", { className: "badge en_attente", children: [g.l.length, " commande", g.l.length > 1 ? 's' : ''] })] }), _jsx("label", { children: "Assigner tout ce quartier \u00E0" }), Choisir({ cle: 'q' + k, liste: g.l, label: `Assigner les ${g.l.length} commande(s)` }), _jsxs("details", { children: [_jsx("summary", { children: "Voir / assigner une par une" }), g.l.map((o) => _jsx(CarteCommande, { o: o, children: Choisir({ cle: o.id, liste: [o], label: 'Assigner' }) }, o.id))] })] }, k)))), t === 'suivi' && (!suivi.length ? _jsx(Vide, { children: "Aucune commande en cours." }) : suivi.map((o) => (_jsx(CarteCommande, { o: o, children: o.statut !== 'livree' && (_jsxs(_Fragment, { children: [_jsx("label", { children: "Changer de livreur" }), Choisir({ cle: o.id, liste: [o], label: 'Réassigner' })] })) }, o.id))))] }));
}
