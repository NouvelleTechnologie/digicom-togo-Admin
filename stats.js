import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { db } from './firebase.js';
import { useLive } from './hooks.js';
import { fcfa, toDate } from './utils.js';
import { ROLES, STATUTS, COMMISSION_TAUX } from './config.js';
import Layout from './layout.js';
import { Alerte, Chargement, Vide } from './ui.js';

const h = _jsx;
const hs = _jsxs;
const K = ({ v, l, c = '' }) => hs('div', { className: 'kpi ' + c, children: [h('b', { children: v }), h('small', { children: l })] });
const nombre = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const itemsDe = (order) => Array.isArray(order?.items) ? order.items : [];
const dateCommande = (order) => toDate(order?.livreeAt) || toDate(order?.createdAt);
const dateReversement = (item) => toDate(item?.date);
const monnaie = (value) => `${nombre(value).toLocaleString('fr-FR')} F CFA`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const ENTREPRISE = {
  nom: 'NEW-TECHK MOBILE CENTER',
  email: 'newtechfacile@gmail.com',
  whatsapp: '+228 93 72 11 74',
  siege: 'Kpélé Adéta, Préfecture de Kpélé, Région des Plateaux, Togo'
};
const LOGO_DIGICOM = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9Ijk2IiBmaWxsPSIjMDA2YTRlIi8+PHJlY3QgeT0iMzUyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjQ4IiBmaWxsPSIjZmZjZTAwIi8+PHRleHQgeD0iMjU2IiB5PSIzMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjIzMCIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+REM8L3RleHQ+PC9zdmc+';
const referenceDocument = (type) => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const horodatage = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const suffixe = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DGC-${type}-${horodatage}-${suffixe}`;
};

function bornes(mode, year, month) {
  const start = mode === 'mois' ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const end = mode === 'mois' ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
  return { start, end };
}
function dedans(date, start, end) {
  return Boolean(date && date >= start && date < end);
}
function telecharger(contenu, nom, type) {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function ouvrirImpression(html, setErreur) {
  const win = window.open('', '_blank');
  if (!win) {
    setErreur("Le navigateur a bloqué la fenêtre d'impression. Autorise les fenêtres pop-up pour DigiCom, puis réessaie.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 400);
}
function enveloppeRapport(titre, sousTitre, contenu, reference) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(titre)}</title><style>
  *{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#172b4d;margin:28px;line-height:1.45}header{border-bottom:3px solid #006a4e;padding-bottom:14px;margin-bottom:20px}.brand{display:flex;align-items:center;gap:14px}.brand img{width:66px;height:66px;object-fit:contain}.brand h1{font-size:23px;margin:0;color:#006a4e}.brand p{margin:3px 0;color:#53657a;font-size:11px}.docref{margin-top:12px;padding:9px 12px;background:#eef4f2;border-left:4px solid #ffce00;font-weight:bold}.meta{color:#53657a;font-size:12px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}.card{border:1px solid #d7e0e8;border-radius:8px;padding:10px}.card b{display:block;font-size:17px;margin-top:5px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:8px;border:1px solid #d9e1e8;text-align:left;font-size:12px}th{background:#eef4f2}.right{text-align:right}.note{margin-top:22px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#687789}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:34px}.signature{border-top:1px solid #8492a6;padding-top:7px;font-size:11px;color:#53657a;min-height:45px}@media print{body{margin:12mm}.no-print{display:none}header{break-inside:avoid}table{break-inside:auto}tr{break-inside:avoid}}
  @media(max-width:600px){body{margin:12px}.cards{grid-template-columns:1fr 1fr}.brand img{width:52px;height:52px}}
  </style></head><body><header><div class="brand"><img src="${LOGO_DIGICOM}" alt="Logo DigiCom"><div><h1>DigiCom Togo</h1><p>Plateforme de vente et livraison de proximité</p><p><strong>${escapeHtml(ENTREPRISE.nom)}</strong></p><p>${escapeHtml(ENTREPRISE.siege)}</p><p>${escapeHtml(ENTREPRISE.email)} · WhatsApp ${escapeHtml(ENTREPRISE.whatsapp)}</p></div></div><div class="docref">REÇU RÉCAPITULATIF / ÉTAT DE GESTION INTERNE · Référence : ${escapeHtml(reference)}</div><p><strong>${escapeHtml(titre)}</strong></p><p class="meta">${escapeHtml(sousTitre)} · Édité le ${new Date().toLocaleString('fr-FR')}</p></header>${contenu}<div class="signatures"><div class="signature">Établi par : Administration DigiCom<br>Nom et signature</div><div class="signature">Visa / cachet NEW-TECHK MOBILE CENTER</div></div><div class="note">Document récapitulatif interne généré automatiquement à partir des données disponibles dans DigiCom. Il ne constitue pas une preuve de paiement Mobile Money, bancaire ou un reçu fiscal. Les paiements doivent être justifiés par les références et confirmations des opérateurs concernés.</div></body></html>`;
}

export default function Stats() {
  const cmds = useLive(() => collection(db, 'commandes'));
  const abos = useLive(() => collection(db, 'abonnements'));
  const pays = useLive(() => collection(db, 'paiementsAbo'));
  const users = useLive(() => collection(db, 'users'));
  const prods = useLive(() => collection(db, 'produits'));
  const rev = useLive(() => collection(db, 'reversements'));
  const now = new Date();
  const [mode, setMode] = useState('mois');
  const [annee, setAnnee] = useState(String(now.getFullYear()));
  const [mois, setMois] = useState(String(now.getMonth() + 1));
  const [vendeurId, setVendeurId] = useState('');
  const [erreur, setErreur] = useState('');

  const donnees = useMemo(() => {
    if (!cmds || !abos || !pays || !users || !prods || !rev) return null;
    const year = Math.max(2000, Math.min(2100, Number(annee) || now.getFullYear()));
    const month = Math.max(1, Math.min(12, Number(mois) || 1));
    const { start, end } = bornes(mode, year, month);
    const libelle = mode === 'mois'
      ? start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : String(year);
    const livrees = cmds.filter((order) => order.statut === 'livree');
    const commandesPeriode = livrees.filter((order) => dedans(dateCommande(order), start, end));
    const ventesArticles = (orders) => orders.reduce((sum, order) => sum + itemsDe(order).reduce((part, item) => part + nombre(item.prix) * nombre(item.qte), 0), 0);
    const quantites = (orders) => orders.reduce((sum, order) => sum + itemsDe(order).reduce((part, item) => part + nombre(item.qte), 0), 0);
    const totalCommandes = commandesPeriode.reduce((sum, order) => sum + nombre(order.total), 0);
    const caProduits = ventesArticles(commandesPeriode);
    const totalArticles = quantites(commandesPeriode);
    const paiementsPeriode = pays.filter((p) => dedans(toDate(p.date), start, end));
    const revenuAbo = paiementsPeriode.reduce((sum, p) => sum + nombre(p.prix), 0);
    const reversementsPeriode = rev.filter((r) => dedans(dateReversement(r), start, end));
    const vendeurs = users.filter((u) => u.role === 'abonne').map((u) => {
      const lignes = commandesPeriode.flatMap((order) => itemsDe(order).filter((item) => item.abonneId === u.id).map((item) => ({
        commandeId: order.id,
        date: dateCommande(order),
        nom: item.nom || 'Produit',
        prix: nombre(item.prix),
        qte: nombre(item.qte),
        ca: nombre(item.prix) * nombre(item.qte)
      })));
      const ca = lignes.reduce((sum, line) => sum + line.ca, 0);
      const qte = lignes.reduce((sum, line) => sum + line.qte, 0);
      const commission = Math.round(ca * COMMISSION_TAUX / 100);
      const reversements = reversementsPeriode.filter((r) => r.abonneId === u.id).reduce((sum, r) => sum + nombre(r.montant), 0);
      const jusquAFin = livrees.filter((order) => {
        const date = dateCommande(order);
        return date && date < end;
      });
      const caCumule = ventesArticles(jusquAFin.map((order) => ({ ...order, items: itemsDe(order).filter((item) => item.abonneId === u.id) })));
      const commissionCumulee = Math.round(caCumule * COMMISSION_TAUX / 100);
      const reverseCumule = rev.filter((r) => r.abonneId === u.id && dateReversement(r) && dateReversement(r) < end)
        .reduce((sum, r) => sum + nombre(r.montant), 0);
      const soldeFin = Math.max(0, commissionCumulee - reverseCumule);
      const produits = {};
      lignes.forEach((line) => {
        const key = line.nom;
        if (!produits[key]) produits[key] = { nom: key, qte: 0, ca: 0 };
        produits[key].qte += line.qte;
        produits[key].ca += line.ca;
      });
      return { uid: u.id, nom: u.nom || u.email || 'Vendeur', email: u.email || '', telephone: u.tel || '', ca, qte, commission, net: ca - commission, reversements, soldeFin, nbCommandes: new Set(lignes.map((line) => line.commandeId)).size, produits: Object.values(produits).sort((a, b) => b.ca - a.ca), lignes };
    }).sort((a, b) => b.ca - a.ca);
    const topProduits = {};
    commandesPeriode.forEach((order) => itemsDe(order).forEach((item) => {
      const key = item.nom || 'Produit sans nom';
      if (!topProduits[key]) topProduits[key] = { nom: key, qte: 0, ca: 0 };
      topProduits[key].qte += nombre(item.qte);
      topProduits[key].ca += nombre(item.prix) * nombre(item.qte);
    }));
    const topProduitsListe = Object.values(topProduits).sort((a, b) => b.qte - a.qte).slice(0, 8);
    const commissionTotale = vendeurs.reduce((sum, seller) => sum + seller.commission, 0);
    const totalReverse = reversementsPeriode.reduce((sum, r) => sum + nombre(r.montant), 0);
    return {
      year, month, start, end, libelle, commandesPeriode, totalCommandes, caProduits, totalArticles,
      revenuAbo, paiementsPeriode, vendeurs, commissionTotale, totalReverse, topProduitsListe,
      revenuDigiCom: commissionTotale + revenuAbo,
      commandesEnCours: cmds.filter((order) => order.statut !== 'livree').length,
      abonnementsActifs: abos.filter((abo) => abo.actif !== false && toDate(abo.dateFin) && toDate(abo.dateFin) > now).length,
      roles: users.reduce((acc, user) => { acc[user.role] = (acc[user.role] || 0) + 1; return acc; }, {}),
      produitsEnLigne: prods.filter((p) => p.actif !== false && (p.statut || 'valide') === 'valide').length,
      commandesParStatut: Object.keys(STATUTS).map((key) => ({ key, nom: STATUTS[key], total: cmds.filter((order) => order.statut === key).length }))
    };
  }, [cmds, abos, pays, users, prods, rev, mode, annee, mois]);

  if (!donnees) return hs(Layout, { children: [h('h2', { children: 'Statistiques DigiCom' }), h(Chargement, {})] });

  const vendeurChoisi = donnees.vendeurs.find((seller) => seller.uid === vendeurId) || null;
  const lignesGlobales = [
    ['Commandes livrées', donnees.commandesPeriode.length],
    ['Articles vendus', donnees.totalArticles],
    ['Ventes produits', monnaie(donnees.caProduits)],
    ['Montant total des commandes livrées', monnaie(donnees.totalCommandes)],
    ['Commissions générées', monnaie(donnees.commissionTotale)],
    ['Reversements de commissions', monnaie(donnees.totalReverse)],
    ['Paiements abonnements', monnaie(donnees.revenuAbo)],
    ['Revenus DigiCom estimés', monnaie(donnees.revenuDigiCom)]
  ];

  const contenuGlobal = () => {
    const summary = `<div class="cards">${[
      ['Ventes produits', monnaie(donnees.caProduits)], ['Commissions', monnaie(donnees.commissionTotale)], ['Abonnements', monnaie(donnees.revenuAbo)]
    ].map(([label, value]) => `<div class="card">${escapeHtml(label)}<b>${escapeHtml(value)}</b></div>`).join('')}</div>`;
    const metrics = `<table><tbody>${lignesGlobales.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td class="right">${escapeHtml(value)}</td></tr>`).join('')}</tbody></table>`;
    const sellers = `<h2>Statistiques par vendeur</h2><table><thead><tr><th>Vendeur</th><th>Commandes</th><th>Quantité</th><th>Ventes</th><th>Commission</th><th>Net vendeur</th><th>Solde commission fin période</th></tr></thead><tbody>${donnees.vendeurs.map((seller) => `<tr><td>${escapeHtml(seller.nom)}</td><td>${seller.nbCommandes}</td><td>${seller.qte}</td><td>${escapeHtml(monnaie(seller.ca))}</td><td>${escapeHtml(monnaie(seller.commission))}</td><td>${escapeHtml(monnaie(seller.net))}</td><td>${escapeHtml(monnaie(seller.soldeFin))}</td></tr>`).join('')}</tbody></table>`;
    return `<h2>Résumé global — ${escapeHtml(donnees.libelle)}</h2>${summary}${metrics}${sellers}`;
  };

  const contenuVendeur = (seller) => {
    const products = `<h2>Ventes par produit</h2><table><thead><tr><th>Produit</th><th>Quantité vendue</th><th>Chiffre d'affaires</th></tr></thead><tbody>${seller.produits.map((p) => `<tr><td>${escapeHtml(p.nom)}</td><td>${p.qte}</td><td>${escapeHtml(monnaie(p.ca))}</td></tr>`).join('') || '<tr><td colspan="3">Aucune vente livrée sur cette période.</td></tr>'}</tbody></table>`;
    const metrics = `<div class="cards">${[
      ['Ventes de la période', monnaie(seller.ca)], ['Commission période', monnaie(seller.commission)], ['Net après commission', monnaie(seller.net)],
      ['Reversements période', monnaie(seller.reversements)], ['Solde commission fin période', monnaie(seller.soldeFin)], ['Commandes concernées', seller.nbCommandes]
    ].map(([label, value]) => `<div class="card">${escapeHtml(label)}<b>${escapeHtml(value)}</b></div>`).join('')}</div>`;
    return `<h2>Compte vendeur — ${escapeHtml(seller.nom)}</h2><p>Email : ${escapeHtml(seller.email)} · Téléphone : ${escapeHtml(seller.telephone)}</p>${metrics}${products}<p class="meta">Commission calculée au taux général de ${COMMISSION_TAUX} %. Le solde est estimé sur l'ensemble des ventes livrées et reversements enregistrés jusqu'à la fin de la période choisie.</p>`;
  };

  const exporterGlobalHtml = () => {
    const title = `État global DigiCom — ${donnees.libelle}`;
    const html = enveloppeRapport(title, `Période : ${donnees.start.toLocaleDateString('fr-FR')} au ${new Date(donnees.end.getTime() - 1).toLocaleDateString('fr-FR')}`, contenuGlobal(), referenceDocument('GLOBAL'));
    telecharger(html, `digicom-etat-global-${donnees.year}${mode === 'mois' ? '-' + String(donnees.month).padStart(2, '0') : ''}.html`, 'text/html;charset=utf-8');
  };
  const imprimerGlobal = () => {
    const title = `État global DigiCom — ${donnees.libelle}`;
    const html = enveloppeRapport(title, `Période : ${donnees.start.toLocaleDateString('fr-FR')} au ${new Date(donnees.end.getTime() - 1).toLocaleDateString('fr-FR')}`, contenuGlobal(), referenceDocument('GLOBAL'));
    ouvrirImpression(html, setErreur);
  };
  const exporterGlobalCsv = () => {
    const rows = [
      ['Type', 'Période / Nom', 'Commandes', 'Quantité', 'Ventes produits (FCFA)', 'Commission (FCFA)', 'Abonnements (FCFA)', 'Revenu DigiCom estimé (FCFA)', 'Reversements période (FCFA)', 'Solde fin période (FCFA)'],
      ['GLOBAL', donnees.libelle, donnees.commandesPeriode.length, donnees.totalArticles, donnees.caProduits, donnees.commissionTotale, donnees.revenuAbo, donnees.revenuDigiCom, donnees.totalReverse, ''],
      ...donnees.vendeurs.map((seller) => ['VENDEUR', seller.nom, seller.nbCommandes, seller.qte, seller.ca, seller.commission, '', '', seller.reversements, seller.soldeFin])
    ];
    telecharger('\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n'), `digicom-etat-global-${donnees.year}${mode === 'mois' ? '-' + String(donnees.month).padStart(2, '0') : ''}.csv`, 'text/csv;charset=utf-8');
  };
  const exporterVendeurHtml = () => {
    if (!vendeurChoisi) return;
    const title = `Statistiques vendeur — ${vendeurChoisi.nom} — ${donnees.libelle}`;
    const html = enveloppeRapport(title, `Période : ${donnees.start.toLocaleDateString('fr-FR')} au ${new Date(donnees.end.getTime() - 1).toLocaleDateString('fr-FR')}`, contenuVendeur(vendeurChoisi), referenceDocument('VENDEUR'));
    telecharger(html, `digicom-vendeur-${vendeurChoisi.uid}-${donnees.year}${mode === 'mois' ? '-' + String(donnees.month).padStart(2, '0') : ''}.html`, 'text/html;charset=utf-8');
  };
  const imprimerVendeur = () => {
    if (!vendeurChoisi) return;
    const title = `Statistiques vendeur — ${vendeurChoisi.nom} — ${donnees.libelle}`;
    const html = enveloppeRapport(title, `Période : ${donnees.start.toLocaleDateString('fr-FR')} au ${new Date(donnees.end.getTime() - 1).toLocaleDateString('fr-FR')}`, contenuVendeur(vendeurChoisi), referenceDocument('VENDEUR'));
    ouvrirImpression(html, setErreur);
  };
  const exporterVendeurCsv = () => {
    if (!vendeurChoisi) return;
    const rows = [
      ['Vendeur', 'Produit', 'Quantité', 'Chiffre affaires (FCFA)'],
      ...vendeurChoisi.produits.map((p) => [vendeurChoisi.nom, p.nom, p.qte, p.ca]),
      ['TOTAL', '', vendeurChoisi.qte, vendeurChoisi.ca],
      ['COMMISSION', '', '', vendeurChoisi.commission],
      ['NET VENDEUR', '', '', vendeurChoisi.net],
      ['REVERSEMENTS PERIODE', '', '', vendeurChoisi.reversements],
      ['SOLDE FIN PERIODE', '', '', vendeurChoisi.soldeFin]
    ];
    telecharger('\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n'), `digicom-vendeur-${vendeurChoisi.uid}-${donnees.year}${mode === 'mois' ? '-' + String(donnees.month).padStart(2, '0') : ''}.csv`, 'text/csv;charset=utf-8');
  };

  const years = Array.from({ length: 8 }, (_, index) => now.getFullYear() - index);
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const jours = [...Array(7)].map((_, index) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - index)); return d; });
  const ventes7Jours = jours.map((day) => cmds.filter((order) => order.statut === 'livree' && dateCommande(order)?.toDateString() === day.toDateString()).reduce((sum, order) => sum + nombre(order.total), 0));
  const maxJour = Math.max(1, ...ventes7Jours);
  const parRole = donnees.roles;

  return hs(Layout, { children: [
    h('h2', { children: 'Tableau de bord et rapports' }),
    hs('div', { className: 'carte', children: [
      h('h3', { children: 'Période du rapport' }),
      hs('div', { className: 'deux', children: [
        hs('div', { children: [h('label', { children: 'Type de rapport' }), hs('select', { value: mode, onChange: (event) => setMode(event.target.value), children: [h('option', { value: 'mois', children: 'Mensuel' }), h('option', { value: 'annee', children: 'Annuel' })] })] }),
        hs('div', { children: [h('label', { children: 'Année' }), h('select', { value: annee, onChange: (event) => setAnnee(event.target.value), children: years.map((year) => h('option', { value: String(year), children: year }, year)) })] })
      ] }),
      mode === 'mois' && hs('div', { children: [h('label', { children: 'Mois' }), h('select', { value: mois, onChange: (event) => setMois(event.target.value), children: months.map((name, index) => h('option', { value: String(index + 1), children: name }, name)) })] }),
      h(Alerte, { type: 'info', children: `Rapport sélectionné : ${donnees.libelle}. Les commandes comptabilisées sont celles dont le statut est « Livrée » pendant cette période.` })
    ] }),
    hs('div', { className: 'kpis', children: [
      h(K, { v: monnaie(donnees.caProduits), l: 'Ventes produits livrées' }),
      h(K, { v: monnaie(donnees.revenuAbo), l: 'Paiements abonnements', c: 'j' }),
      h(K, { v: monnaie(donnees.revenuDigiCom), l: 'Revenus DigiCom estimés', c: 'j' }),
      h(K, { v: donnees.commandesPeriode.length, l: 'Commandes livrées' }),
      h(K, { v: donnees.totalArticles, l: 'Articles vendus' }),
      h(K, { v: monnaie(donnees.totalReverse), l: 'Reversements période' }),
      h(K, { v: donnees.abonnementsActifs, l: 'Abonnés actifs' }),
      h(K, { v: donnees.commandesEnCours, l: 'Commandes non livrées', c: 'r' }),
      h(K, { v: donnees.produitsEnLigne, l: 'Produits en ligne' })
    ] }),
    hs('div', { className: 'carte', children: [
      h('h3', { children: 'Téléchargement du reçu / état global' }),
      h('p', { className: 'gris', children: 'L’état global rassemble les commandes livrées, les commissions, les reversements et les paiements d’abonnement de la période.' }),
      hs('div', { className: 'actions', children: [
        h('button', { className: 'btn', onClick: exporterGlobalHtml, children: 'Télécharger état global (HTML)' }),
        h('button', { className: 'btn jaune', onClick: imprimerGlobal, children: 'Imprimer / Enregistrer en PDF' }),
        h('button', { className: 'btn gris-b', onClick: exporterGlobalCsv, children: 'Exporter données CSV' })
      ] })
    ] }),
    hs('div', { className: 'carte', children: [
      h('h3', { children: 'Statistique individuelle d’un vendeur' }),
      h('label', { children: 'Sélectionner le vendeur' }),
      h('select', { value: vendeurId, onChange: (event) => { setVendeurId(event.target.value); setErreur(''); }, children: [h('option', { value: '', children: 'Choisir un vendeur…' }), ...donnees.vendeurs.map((seller) => h('option', { value: seller.uid, children: seller.nom }, seller.uid))] }),
      vendeurChoisi ? hs('div', { children: [
        hs('div', { className: 'kpis', children: [
          h(K, { v: monnaie(vendeurChoisi.ca), l: 'Ventes livrées' }),
          h(K, { v: monnaie(vendeurChoisi.commission), l: `Commission (${COMMISSION_TAUX} %)` }),
          h(K, { v: monnaie(vendeurChoisi.net), l: 'Net après commission' }),
          h(K, { v: monnaie(vendeurChoisi.soldeFin), l: 'Solde commission fin période', c: 'r' })
        ] }),
        hs('div', { className: 'actions', children: [
          h('button', { className: 'btn', onClick: exporterVendeurHtml, children: 'Télécharger rapport vendeur (HTML)' }),
          h('button', { className: 'btn jaune', onClick: imprimerVendeur, children: 'Imprimer / Enregistrer en PDF' }),
          h('button', { className: 'btn gris-b', onClick: exporterVendeurCsv, children: 'Exporter vendeur CSV' })
        ] })
      ] }) : h('p', { className: 'gris', children: donnees.vendeurs.length ? 'Choisis un vendeur pour afficher et exporter ses chiffres.' : 'Aucun compte vendeur trouvé.' })
    ] }),
    h(Alerte, { children: erreur }),
    hs('div', { className: 'carte', children: [
      h('h3', { children: 'Ventes — 7 derniers jours' }),
      hs('div', { className: 'barres', children: ventes7Jours.map((value, index) => hs('div', { children: [h('i', { style: { height: (value / maxJour) * 90 + '%' } }), h('span', { children: jours[index].toLocaleDateString('fr-FR', { weekday: 'short' }) })] }, index)) })
    ] }),
    hs('div', { className: 'carte', children: [h('h3', { children: 'Commandes par statut' }), ...donnees.commandesParStatut.map((line) => hs('div', { className: 'ligne', children: [h('span', { children: line.nom }), h('b', { children: line.total })] }, line.key))] }),
    hs('div', { className: 'carte', children: [
      h('h3', { children: 'Vendeurs — période sélectionnée' }),
      ...(donnees.vendeurs.length ? donnees.vendeurs.map((seller) => hs('div', { className: 'ligne', children: [
        hs('span', { children: [h('b', { children: seller.nom }), h('br', {}), h('small', { className: 'gris', children: `${seller.nbCommandes} commande(s) · ${seller.qte} article(s) · Commission ${monnaie(seller.commission)}` })] }),
        h('b', { children: monnaie(seller.ca) })
      ] }, seller.uid)) : [h(Vide, { children: 'Aucune vente par vendeur sur cette période.' })])
    ] }),
    hs('div', { className: 'carte', children: [
      h('h3', { children: 'Produits les plus vendus — période' }),
      ...(donnees.topProduitsListe.length ? donnees.topProduitsListe.map((product) => hs('div', { className: 'ligne', children: [h('span', { children: product.nom }), h('b', { children: `${product.qte} · ${monnaie(product.ca)}` })] }, product.nom)) : [h(Vide, { children: 'Aucune vente livrée sur cette période.' })])
    ] }),
    hs('div', { className: 'carte', children: [
      h('h3', { children: 'Utilisateurs par rôle' }),
      ...Object.entries(ROLES).map(([key, label]) => hs('div', { className: 'ligne', children: [h('span', { children: label }), h('b', { children: parRole[key] || 0 })] }, key))
    ] })
  ] });
}
