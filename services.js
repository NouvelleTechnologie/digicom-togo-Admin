import {
  doc, getDoc, setDoc, getDocs, collection, query, where,
  writeBatch, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase.js';
import { PLANS } from './config.js';
import { addMonths, toDate } from './utils.js';

// Paiement saisi par l'administrateur après vérification de l'encaissement.
// L'abonnement, son reçu interne et la date de visibilité des produits sont regroupés.
export async function payerAbonnement({ uid, nom, mois, mode, reference }) {
  const plan = PLANS[Number(mois)];
  if (!plan) throw new Error('Durée d’abonnement invalide.');
  if (!uid) throw new Error('Compte vendeur introuvable.');

  const aboRef = doc(db, 'abonnements', uid);
  const aboSnap = await getDoc(aboRef);
  const now = new Date();
  const ancienneFin = aboSnap.exists() ? toDate(aboSnap.data().dateFin) : null;
  const depart = ancienneFin && ancienneFin > now ? ancienneFin : now;
  const fin = addMonths(depart, plan.mois);
  const paiementRef = doc(collection(db, 'paiementsAbo'));
  const produitsSnap = await getDocs(query(collection(db, 'produits'), where('abonneId', '==', uid)));
  let batch = writeBatch(db);
  let writes = 0;

  batch.set(aboRef, {
    uid, nom, plan: plan.mois, prix: plan.prix, mode,
    reference: reference || '', dateDebut: Timestamp.fromDate(now),
    dateFin: Timestamp.fromDate(fin), actif: true, updatedAt: serverTimestamp()
  }, { merge: true });
  batch.set(paiementRef, {
    uid, nom, mois: plan.mois, prix: plan.prix, mode,
    reference: reference || '', date: serverTimestamp()
  });
  writes = 2;
  for (const snapshot of produitsSnap.docs) {
    if (writes >= 500) {
      await batch.commit();
      batch = writeBatch(db);
      writes = 0;
    }
    batch.update(snapshot.ref, { abonneFin: Timestamp.fromDate(fin) });
    writes += 1;
  }
  if (writes > 0) await batch.commit();
  return fin;
}

// Journal d'activité : une panne du journal ne doit jamais interrompre une action.
export function logAction(action, detail = '') {
  try {
    const actor = window.__acteur;
    if (!actor) return;
    const entry = doc(collection(db, 'journal'));
    setDoc(entry, {
      date: serverTimestamp(), acteurId: actor.uid,
      acteurNom: actor.nom || '', role: actor.role || '',
      action: action || '', detail: detail || ''
    }).catch(() => {});
  } catch (error) {
    // Journal facultatif.
  }
}
