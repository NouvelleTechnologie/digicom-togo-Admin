import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { STATUTS, MODES_PAIEMENT } from './config.js';
import { fcfa, heureFr, waLien } from './utils.js';
export const Chargement = () => _jsx("div", { className: "plein", children: _jsx("div", { className: "spin" }) });
export const Vide = ({ children }) => _jsx("p", { className: "vide", children: children });
export const Badge = ({ statut }) => _jsx("span", { className: 'badge ' + statut, children: STATUTS[statut] || statut });
export const Alerte = ({ type = 'err', children }) => children ? _jsx("p", { className: 'alerte ' + type, children: children }) : null;
// Carte commande réutilisée par tous les rôles.
// filtreAbonne : n'affiche que les articles de cet abonné.
export function CarteCommande({ o, filtreAbonne, children }) {
    const items = filtreAbonne ? o.items.filter((i) => i.abonneId === filtreAbonne) : o.items;
    const total = filtreAbonne ? items.reduce((s, i) => s + i.prix * i.qte, 0) : o.total;
    return (_jsxs("div", { className: "carte cmd", children: [_jsxs("div", { className: "ligne", children: [_jsxs("b", { children: ["#", o.id.slice(0, 6).toUpperCase()] }), _jsx(Badge, { statut: o.statut })] }), _jsxs("small", { className: "gris", children: [heureFr(o.createdAt), " \u00B7 ", o.acheteurNom] }), _jsx("ul", { className: "art", children: items.map((i, k) => (_jsxs("li", { children: [_jsxs("span", { children: [i.qte, " \u00D7 ", i.nom] }), _jsx("span", { children: fcfa(i.prix * i.qte) })] }, k))) }), _jsxs("div", { className: "ligne", children: [_jsxs("span", { children: ["Total", filtreAbonne ? ' (vos articles)' : ''] }), _jsx("b", { children: fcfa(total) })] }), !filtreAbonne && (_jsxs("small", { className: "gris", children: ["\uD83D\uDCCD ", o.adresse, " \u00B7 ", _jsx("a", { href: 'tel:' + o.telephone, children: o.telephone }), " \u00B7 ", _jsx("a", { href: waLien(o.telephone, 'Bonjour, concernant votre commande DigiCom #' + o.id.slice(0, 6).toUpperCase()), target: "_blank", rel: "noreferrer", children: "WhatsApp" }), o.quartier ? ' · Quartier : ' + o.quartier : '', _jsx("br", {}), "Paiement : ", MODES_PAIEMENT[o.paiement?.mode] || '—', o.livreurNom ? ` · Livreur : ${o.livreurNom}` : ''] })), o.preuve?.photo && _jsxs("details", { children: [_jsx("summary", { children: "Preuve de livraison" }), _jsx("img", { src: o.preuve.photo, alt: "Preuve", style: { width: '100%', borderRadius: 8, marginTop: 6 } }), o.preuve.note && _jsx("small", { className: "gris", children: o.preuve.note })] }), children] }));
}
