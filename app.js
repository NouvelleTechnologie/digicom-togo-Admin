import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './authcontext.js';
import { ROUTES } from './config.js';
import Login from './login.js';
import Admin from './admin.js';
import Abonne from './abonne.js';
import Livreur from './livreur.js';
import Chef from './chef.js';
import Stats from './stats.js';
function Protege({ role, children }) {
    const { loading, profile } = useAuth();
    if (loading)
        return _jsx("div", { className: "plein", children: _jsx("div", { className: "spin" }) });
    if (!profile)
        return _jsx(Navigate, { to: "/", replace: true });
    if (profile.role !== role)
        return _jsx(Navigate, { to: ROUTES[profile.role] || '/', replace: true });
    return children;
}
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Login, {}) }), _jsx(Route, { path: "/admin", element: _jsx(Protege, { role: "admin", children: _jsx(Admin, {}) }) }), _jsx(Route, { path: "/abonne", element: _jsx(Protege, { role: "abonne", children: _jsx(Abonne, {}) }) }), _jsx(Route, { path: "/livreur", element: _jsx(Protege, { role: "livreur", children: _jsx(Livreur, {}) }) }), _jsx(Route, { path: "/chef", element: _jsx(Protege, { role: "chef", children: _jsx(Chef, {}) }) }), _jsx(Route, { path: "/stats", element: _jsx(Protege, { role: "stats", children: _jsx(Stats, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
