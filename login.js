import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase.js';
import { useAuth } from './authcontext.js';
import { ROUTES } from './config.js';
import { messageErreur } from './utils.js';
import { Alerte } from './ui.js';
export default function Login() {
    const { profile, loading, error } = useAuth();
    const go = useNavigate();
    const [email, setEmail] = useState('');
    const [mdp, setMdp] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [info, setInfo] = useState('');
    useEffect(() => { if (profile)
        go(ROUTES[profile.role] || '/', { replace: true }); }, [profile, go]);
    const connecter = async (e) => {
        e.preventDefault();
        setErr('');
        setInfo('');
        setBusy(true);
        try {
            await signInWithEmailAndPassword(auth, email.trim(), mdp);
        }
        catch (x) {
            setErr(messageErreur(x));
        }
        setBusy(false);
    };
    const oublie = async () => {
        setErr('');
        setInfo('');
        if (!email)
            return setErr("Saisis d'abord ton email.");
        try {
            await sendPasswordResetEmail(auth, email.trim());
            setInfo('Email de réinitialisation envoyé.');
        }
        catch (x) {
            setErr(messageErreur(x));
        }
    };
    return (_jsx("div", { className: "login", children: _jsxs("form", { className: "boite", onSubmit: connecter, children: [_jsx("h1", { children: "DigiCom Pro" }), _jsx("p", { className: "gris", children: "Espace \u00E9quipe : admin, abonn\u00E9s, livreurs, chef, statistiques" }), _jsx("label", { children: "Email" }), _jsx("input", { type: "email", autoComplete: "username", value: email, onChange: (e) => setEmail(e.target.value), required: true }), _jsx("label", { children: "Mot de passe" }), _jsx("input", { type: "password", autoComplete: "current-password", value: mdp, onChange: (e) => setMdp(e.target.value), required: true }), _jsx(Alerte, { children: err || error }), _jsx(Alerte, { type: "ok", children: info }), _jsx("button", { className: "btn plein-l", disabled: busy || loading, children: busy ? 'Connexion…' : 'Se connecter' }), _jsx("button", { type: "button", className: "lien", onClick: oublie, children: "Mot de passe oubli\u00E9 ?" }), _jsx("p", { className: "alerte info", style: { marginTop: 14 }, children: "Compte cr\u00E9\u00E9 par l'administration" })] }) }));
}
