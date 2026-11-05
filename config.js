// ====== 1) COLLE ICI TA CONFIG FIREBASE ======
// Console Firebase > Paramètres du projet > Tes applications > Application Web
export const firebaseConfig = {
    apiKey: 'AIzaSyDpzrmjg-B1w4auT3IcaqWyiyoGqSWE_8Y',
    authDomain: 'digicom-togo-6d3ea.firebaseapp.com',
    projectId: 'digicom-togo-6d3ea',
    storageBucket: 'digicom-togo-6d3ea.firebasestorage.app',
    messagingSenderId: '447351292831',
    appId: '1:447351292831:web:53afada40d4cef24f173aa',
};
// Où ranger les photos des produits :
//  'firestore' = dans la base (marche tout de suite, sans activer Storage)
//  'cloudinary' = sur Cloudinary (gratuit, sans carte) : remplis CLOUDINARY ci-dessous puis mets 'cloudinary'
export const STOCKAGE_PHOTOS = 'firestore';
export const CLOUDINARY = { cloudName: 'COLLE_CLOUD_NAME', uploadPreset: 'COLLE_PRESET' };
// ====== 2) RÉGLAGES MÉTIER ======
export const PLANS = {
    1: { mois: 1, label: '1 mois', prix: 5000 },
    6: { mois: 6, label: '6 mois', prix: 24000 },
    12: { mois: 12, label: '12 mois', prix: 42000 },
};
export const FRAIS_LIVRAISON = 1000; // mets 0 pour supprimer
export const MODES_PAIEMENT = {
    moov: 'Moov Money',
    mixx: 'Mixx by Yas',
    livraison: 'Paiement à la livraison',
};
// Pour les abonnements : paiement encaissé par l'admin
export const MODES_ABO = { moov: 'Moov Money', mixx: 'Mixx by Yas', especes: 'Espèces' };
export const ROLES = {
    admin: 'Administrateur',
    abonne: 'Abonné',
    acheteur: 'Acheteur',
    livreur: 'Livreur',
    chef: 'Chef de livraison',
    stats: 'Statistique',
};
export const ROUTES = {
    admin: '/admin',
    abonne: '/abonne',
    acheteur: '/acheteur',
    livreur: '/livreur',
    chef: '/chef',
    stats: '/stats',
};
export const STATUTS = {
    en_attente: 'En attente',
    assignee: 'Livreur assigné',
    en_cours: 'En cours de livraison',
    livree: 'Livrée',
};
export const CATEGORIES = ['Mode', 'Électronique', 'Maison', 'Beauté', 'Alimentation', 'Enfants', 'Autres'];
// Commission DigiCom prélevée sur les ventes livrées (en %). Modifie ce nombre si besoin.
export const COMMISSION_TAUX = 10;
// Alerte de stock bas pour les abonnés
export const STOCK_BAS = 3;
// Ville ajoutée aux adresses pour l'itinéraire Google Maps
export const VILLE_DEFAUT = 'Lomé, Togo';
