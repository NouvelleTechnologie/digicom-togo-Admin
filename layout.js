import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase.js';
import { useAuth } from './authcontext.js';
import { ROLES } from './config.js';
export default function Layout({ nav, children }) {
    const { profile } = useAuth();
    const go = useNavigate();
    const quitter = async () => { await signOut(auth); go('/'); };
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "top", children: [_jsxs("div", { children: [_jsx("b", { className: "logo", children: "DigiCom Togo" }), _jsx("small", { children: profile ? `${profile.nom || profile.email || 'Utilisateur'} · ${ROLES[profile.role]}` : 'Visiteur' })] }), profile ? (_jsx("button", { className: "btn mini clair", onClick: quitter, children: "Quitter" })) : (_jsx(Link, { className: "btn mini clair", style: { textDecoration: 'none' }, to: "/", children: "Connexion" }))] }), nav && (_jsx("nav", { className: "nav", children: nav.map(([to, label]) => (_jsx(NavLink, { to: to, end: to.split('/').length <= 2, children: label }, to))) })), _jsx("main", { className: "page", children: children })] }));
}
export function Onglets({ liste, actif, onChange }) {
    return (_jsx("div", { className: "onglets", children: liste.map(([k, label]) => (_jsx("button", { className: k === actif ? 'on' : '', onClick: () => onChange(k), children: label }, k))) }));
}
