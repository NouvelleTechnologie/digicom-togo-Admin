export const fcfa = (n) => (Number(n) || 0).toLocaleString('fr-FR') + ' F';
export const toDate = (value) => {
    if (value == null || value === '') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value.toDate === 'function') {
        try { const d = value.toDate(); return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null; } catch { return null; }
    }
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};
export const ms = (value) => toDate(value)?.getTime() ?? 0;
export const dateFr = (v) => {
    const d = toDate(v);
    return d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};
export const heureFr = (v) => {
    const d = toDate(v);
    return d
        ? d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : '…';
};
export const addMonths = (date, n) => {
    const source = new Date(date);
    const day = source.getDate();
    source.setDate(1);
    source.setMonth(source.getMonth() + Number(n || 0));
    const lastDay = new Date(source.getFullYear(), source.getMonth() + 1, 0).getDate();
    source.setDate(Math.min(day, lastDay));
    return source;
};
export const parRecent = (a, b) => ms(b.createdAt) - ms(a.createdAt);
// Réduit une photo (max 1000px, JPEG) pour économiser les données mobiles
export function compresserImage(file, max = 1000, qualite = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const r = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * r);
            c.height = Math.round(img.height * r);
            const context = c.getContext('2d');
            if (!context) { URL.revokeObjectURL(url); reject(new Error('Ce navigateur ne peut pas traiter cette image.')); return; }
            context.drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            c.toBlob((b) => (b ? resolve(b) : reject(new Error('Image illisible'))), 'image/jpeg', qualite);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
        img.src = url;
    });
}
export const blobVersDataUrl = (b) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(b);
});
export const messageErreur = (e) => {
    const c = e?.code || '';
    if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found'))
        return 'Email ou mot de passe incorrect.';
    if (c.includes('too-many-requests'))
        return 'Trop de tentatives. Réessaie dans quelques minutes.';
    if (c.includes('network') || c.includes('unavailable'))
        return 'Connexion Internet ou service Firebase indisponible. Vérifie le réseau puis réessaie.';
    if (c.includes('failed-precondition'))
        return 'Une configuration Firebase ou un index Firestore est nécessaire. Consulte la console Firebase.';
    if (c.includes('email-already-in-use'))
        return 'Cet email est déjà utilisé.';
    if (c.includes('weak-password'))
        return 'Mot de passe trop court (6 caractères minimum).';
    if (c.includes('permission-denied'))
        return "Action refusée (droits ou abonnement).";
    return e?.message || 'Une erreur est survenue.';
};
export const lireDataUrl = (blob) => new Promise((ok, reject) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => reject(new Error('Lecture de la photo impossible.')); r.readAsDataURL(blob); });
// Lien WhatsApp (numéro togolais à 8 chiffres : +228 ajouté automatiquement)
export const waLien = (tel, texte = '') => {
    let d = String(tel || '').replace(/\D/g, '');
    if (d.length === 8)
        d = '228' + d;
    return 'https://wa.me/' + d + (texte ? '?text=' + encodeURIComponent(texte) : '');
};
// Itinéraire Google Maps vers une adresse
export const mapsLien = (adresse, ville = 'Lomé, Togo') => 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + encodeURIComponent(adresse + ', ' + ville);
