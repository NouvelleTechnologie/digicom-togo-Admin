# DigiCom Togo — version corrigée

## Déploiement : deux services distincts

### 1. Frontend GitHub Pages
Publier à la racine du dépôt GitHub Pages les fichiers du paquet `DigiCom_FRONTEND_CORRIGE.zip`.
Le point d'entrée est `index.html`. La navigation utilise `HashRouter`.

### 2. Backend IA Render (facultatif)
Le fichier `server.js` et `package.json` constituent un service Node séparé. Les publier dans un service Render distinct, avec la commande `npm start`, puis configurer `OPENAI_API_KEY` et `FRONTEND_ORIGIN=https://nouvelletechnologie.github.io`.

L'URL du backend IA doit être renseignée dans `index.html` à `window.DIGICOM_AI_API_URL`. Ne pas utiliser l'URL du frontend à cet endroit. Une URL IA incorrecte ne doit pas empêcher la connexion Firebase.

## Corrections importantes
- Firestore utilise maintenant la base standard `(default)` avec `getFirestore(app)`.
- Suppression du manifeste mal nommé `manifest (1).json`; remplacement par `manifest.json` et chemins relatifs adaptés à GitHub Pages.
- Suppression de la route `/api/health` en double dans le backend.
- CORS normalisé pour l'origine GitHub Pages (l'en-tête Origin ne contient pas le chemin du dépôt).
- Gestion plus explicite des erreurs Firebase et des erreurs de connexion au backend IA.
- Protection contre les réponses asynchrones obsolètes lors du chargement du profil.

## Vérifications restant à faire sur les services réels
Le code seul ne permet pas de confirmer les réglages de la console Firebase, les règles Firestore, les comptes utilisateurs ni les variables Render. Vérifier notamment :
- Firebase Authentication : connexion par e-mail/mot de passe activée.
- Firebase Authentication > domaines autorisés : `nouvelletechnologie.github.io`.
- Firestore Database : base `(default)` créée et règles autorisant le profil `users/{uid}` au compte concerné.
- Render : le backend IA est un service séparé, démarré et accessible en HTTPS.

Le backend IA fourni est une base fonctionnelle, mais ne doit pas être ouvert au public en production sans validation Firebase des jetons, contrôle du rôle/abonnement et limitation de débit.
