import { doc, getDoc, setDoc, addDoc, getDocs, collection, query, where, writeBatch, Timestamp, serverTimestamp, } from 'firebase/firestore';
import { db } from './firebase.js';
import { PLANS } from './config.js';
import { addMonths } from './utils.js';
// Crée ou renouvelle un abonnement (l'admin encaisse puis enregistre)
export async function payerAbonnement({ uid, nom, mois, mode, reference }) {
    const plan = PLANS[mois];
    const aRef = doc(db, 'abonnements', uid);
    const snap = await getDoc(aRef);
    const now = new Date();
    let depart = now;
    if (snap.exists()) {
        const fin = snap.data().dateFin.toDate();
        if (fin > now)
            depart = fin; // on prolonge à partir de la fin actuelle
    }
    const fin = addMonths(depart, plan.mois);
    await setDoc(aRef, {
        uid, nom, plan: plan.mois, prix: plan.prix, mode, reference: reference || '',
        dateDebut: Timestamp.fromDate(now), dateFin: Timestamp.fromDate(fin), actif: true,
    });
    await addDoc(collection(db, 'paiementsAbo'), {
        uid, nom, mois: plan.mois, prix: plan.prix, mode, reference: reference || '',
        date: serverTimestamp(),
    });
    // Les produits de l'abonné restent visibles jusqu'à la nouvelle date de fin
    const ps = await getDocs(query(collection(db, 'produits'), where('abonneId', '==', uid)));
    const b = writeBatch(db);
    ps.forEach((d) => b.update(d.ref, { abonneFin: Timestamp.fromDate(fin) }));
    await b.commit();
    return fin;
}
// Journal d'activité (réservé à la lecture par l'admin)
import { addDoc as _addDoc } from 'firebase/firestore';
export function logAction(action, detail = '') {
    try {
        const a = window.__acteur;
        if (!a)
            return;
        _addDoc(collection(db, 'journal'), {
            date: serverTimestamp(), acteurId: a.uid, acteurNom: a.nom || '', role: a.role || '', action: action || '', detail: detail || '',
        }).catch(() => { });
    }
    catch (e) { /* le journal ne doit jamais bloquer une action */ }
}
