# DigiCom Togo — Version révisée

Cette archive contient l'application de gestion DigiCom et le service IA Node.js. Tous les fichiers de l'application sont placés à la racine : aucun sous-dossier applicatif n'est nécessaire.

## Corrections importantes apportées

- Connexion Firestore : l'identifiant historique `default` est conservé dans `config.js`, car l'ancienne version fonctionnelle de DigiCom utilisait `getFirestore(app, 'default')`. Le backend Render utilise exactement la même base via `FIRESTORE_DATABASE_ID`.
- Authentification : chargement du profil plus sûr, gestion des profils absents/inactifs, et protection contre les réponses asynchrones arrivant dans le désordre.
- Assistant IA : suppression de l'ancienne URL Render de secours, diagnostic distinct des erreurs réseau/CORS/404, délais d'attente adaptés aux traitements d'image.
- Backend : CORS basé sur les origines réelles (sans chemin GitHub Pages), route santé unique, vérification du jeton Firebase, vérification du rôle `abonne` et de son abonnement, limitation simple des appels.
- Images IA : remplacement de `gpt-image-1`, arrêté le 23 octobre 2026, par `gpt-image-2.5-sunburst` par défaut.
- PWA : manifeste correctement nommé et lié, chemins relatifs compatibles avec GitHub Pages, icônes 192/512/maskable, Service Worker enregistré et cache versionné.
- Statistiques : rapports mensuels ou annuels, export CSV, téléchargement d'un rapport HTML et impression permettant « Enregistrer au format PDF », rapport individuel de chaque vendeur.
- Nettoyage : anciens fichiers de manifeste, feuilles de style et notices redondants retirés après transfert de leurs informations utiles dans ce README.

## 1. Déployer l'application sur GitHub Pages

1. Décompresser l'archive.
2. Copier le contenu du dossier `Digicom` à la racine du dépôt GitHub `digicom-togo-Admin`.
3. Vérifier que `index.html`, `manifest.json`, `main.js`, `firebase.js`, `config.js`, `styles.css`, les images et les autres fichiers `.js` sont tous au même niveau.
4. Publier avec GitHub Pages.

Adresse actuelle attendue du frontend :
`https://nouvelletechnologie.github.io/digicom-togo-Admin/`

### Vérification Firestore avant remplacement

Dans `config.js`, la valeur par défaut est :

```js
export const FIRESTORE_DATABASE_ID = 'default';
```

La version ancienne de DigiCom utilisait explicitement la base nommée `default`. Cette archive conserve donc ce réglage pour ne pas envoyer la connexion vers une base vide. Le serveur IA doit également recevoir `FIRESTORE_DATABASE_ID=default`. Ne change cette valeur que si la console Firebase confirme que les données de production sont dans la base principale `(default)`.

## 2. Déployer le backend IA sur Render — ne pas y envoyer le frontend comme service Node

**Réponse importante : ne déploie pas tout le code comme un seul service Web Node Render.** Garde l'application frontend sur GitHub Pages (comme aujourd'hui) et déploie `server.js` + `package.json` comme service Web Node séparé sur Render. Le serveur Node actuel n'est pas configuré pour servir `index.html` : si tu déploies l'ensemble comme un seul service Node, l'interface ne sera pas automatiquement publiée par ce serveur.

Tu peux conserver les fichiers dans le même dépôt GitHub : GitHub Pages publie `index.html` et les fichiers frontend ; Render exécute `server.js` avec `npm start`. Si Render te demande un dépôt, connecte le dépôt qui contient le dossier `Digicom`. Si ce dossier est la racine du dépôt, laisse Root Directory vide. Si le dossier `Digicom` est un sous-dossier du dépôt, indique `Digicom` comme Root Directory.

Paramètres Render :


Le frontend GitHub Pages ne peut ni exécuter `server.js`, ni protéger une clé OpenAI. Le backend doit être un **service Web Render Node séparé**.

Paramètres Render :

- Runtime : Node.js 22 ou supérieur.
- Root Directory : laisser vide si le dépôt contient ces fichiers à sa racine.
- Build Command : `npm install`
- Start Command : `npm start`

Variables d'environnement à définir dans Render (jamais dans GitHub) :

| Variable | Valeur |
|---|---|
| `OPENAI_API_KEY` | Clé API OpenAI secrète |
| `FIREBASE_PROJECT_ID` | `digicom-togo-6d3ea` |
| `FIRESTORE_DATABASE_ID` | `default` (même base que le frontend) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Contenu JSON complet d'un compte de service Firebase Admin |
| `FRONTEND_ORIGIN` | `https://nouvelletechnologie.github.io` |
| `OPENAI_TEXT_MODEL` | `gpt-4.1-mini` (modifiable si nécessaire) |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2.5-sunburst` |

Pour obtenir le compte de service : Firebase Console → Paramètres du projet → Comptes de service → générer une nouvelle clé privée. Copier le JSON dans la variable secrète Render `FIREBASE_SERVICE_ACCOUNT_JSON`. **Ne jamais téléverser ce JSON dans GitHub ni le transmettre dans une conversation.**

Une fois le service Render déployé, ouvre :

`https://ADRESSE-RENDER-DU-SERVICE-IA.onrender.com/api/health`

Résultat attendu :

```json
{
  "ok": true,
  "service": "digicom-ai",
  "openaiConfigured": true,
  "firebaseAdminConfigured": true,
  "configured": true
}
```

Si `openaiConfigured` vaut `false`, la clé OpenAI manque. Si `firebaseAdminConfigured` vaut `false`, le compte de service Firebase manque ou est invalide. Le backend refuse les appels IA tant que ces deux configurations ne sont pas présentes.

### Raccorder le frontend au backend IA

Après avoir obtenu l'adresse HTTPS réelle du nouveau service IA Render, modifier uniquement cette ligne dans `index.html` :

```js
window.DIGICOM_AI_API_URL = 'https://ADRESSE-RENDER-DU-SERVICE-IA.onrender.com';
```

Ne pas inscrire l'adresse du frontend/administration à la place du backend IA. Ne jamais ajouter `OPENAI_API_KEY` dans `index.html`.

Le backend autorise par défaut l'origine GitHub Pages `https://nouvelletechnologie.github.io`. Si le frontend change de domaine, mettre sa seule origine (sans chemin, sans slash final) dans `FRONTEND_ORIGIN`.

## 3. PWA Builder

Le fichier du manifeste est maintenant `manifest.json` et il est lié dans `index.html`. Les chemins d'icônes et `start_url` sont relatifs à l'application, donc adaptés au dépôt GitHub Pages.

Dans PWA Builder, utiliser l'adresse du site publié :
`https://nouvelletechnologie.github.io/digicom-togo-Admin/`

Le manifeste est directement accessible à :
`https://nouvelletechnologie.github.io/digicom-togo-Admin/manifest.json`

Le Service Worker est `sw.js`. Le cache a été renommé pour forcer le remplacement de l'ancien cache DigiCom erroné.

## 4. Rapports statistiques et reçus récapitulatifs

Dans l'espace Statistiques, les documents imprimables comportent le logo DigiCom, le nom NEW-TECHK MOBILE CENTER, le siège, l'e-mail, le WhatsApp, la période couverte, une référence automatique unique et des emplacements de signature/cachet. Les rapports sont des reçus récapitulatifs internes, pas des justificatifs de paiement.

Dans l'espace Statistiques :

- sélectionner un mois ou une année ;
- télécharger le rapport global en HTML ;
- exporter les données globales en CSV ;
- ouvrir l'impression et choisir « Enregistrer au format PDF » dans Chrome ;
- choisir un vendeur pour exporter ses propres statistiques (HTML, CSV ou PDF via impression).

Les ventes sont calculées sur les commandes dont le statut est `livree`, à la date `livreeAt` (avec repli sur `createdAt` pour les anciennes commandes). Le taux de commission utilise `COMMISSION_TAUX` dans `config.js`. Le solde de commission affiché est estimé à la fin de la période à partir des ventes et reversements enregistrés.

Ces rapports sont des états de gestion internes. Ils ne remplacent pas les preuves de paiement Mobile Money ou les pièces comptables réglementaires.

## 5. Tests à effectuer après déploiement

1. Connexion avec l'ancien compte administrateur.
2. Ouverture des onglets Utilisateurs, Produits, Commandes et Statistiques.
3. Création d'un compte test vendeur et vérification que l'admin reste connecté.
4. Renouvellement d'un abonnement test.
5. Connexion du vendeur et création d'un produit.
6. Vérification des rapports mensuels/annuels et de l'export vendeur.
7. Vérification du endpoint `/api/health` avant le premier essai IA.
8. Essai description IA, puis photo IA avec un compte vendeur dont l'abonnement est actif.
9. Dans Chrome, vérifier que la page manifeste charge les trois icônes et que le Service Worker est actif.

## Limites de validation

Les fichiers ont fait l'objet de contrôles statiques (syntaxe JavaScript, imports locaux, JSON du manifeste et recherche de doublons). Je ne peux pas confirmer une connexion réelle à Firebase, un déploiement Render ou une génération OpenAI sans les identifiants et services actifs de ton compte. Le ZIP ne contient aucune clé secrète.
