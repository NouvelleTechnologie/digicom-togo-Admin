# DigiCom — intégration IA vendeur

## Ce qui est raccordé dans cette archive
- L’assistant IA est importé depuis `abonne.js` et affiché dans le formulaire vendeur.
- La description générée est replacée dans le champ `description`.
- La photo améliorée, après validation, est ajoutée à la liste de photos existante. Elle suit ensuite le circuit de compression et d’enregistrement déjà utilisé par DigiCom.
- Le style IA est intégré à `styles.css` pour fonctionner avec le site statique actuel.
- Les références locales restent à la racine du projet.

## Configuration du service IA
Dans `index.html`, renseignez `window.DIGICOM_AI_API_URL` avec l’URL HTTPS réelle du serveur IA. Laissez vide tant que le serveur n’est pas déployé. Ne mettez jamais de clé OpenAI dans le site.

Le fichier `server.js` utilise `OPENAI_API_KEY` uniquement côté serveur. Il faut déployer `server.js` et `package.json` sur un hébergement Node.js, définir `OPENAI_API_KEY` et `FRONTEND_ORIGIN`, puis vérifier `/api/health`.

## IMPORTANT — avant ouverture au public
Le serveur fourni est un squelette de service IA et ne doit pas être exposé publiquement tel quel. Le client transmet un jeton Firebase ID, mais le serveur doit encore vérifier ce jeton côté serveur avec Firebase Admin, vérifier le rôle et l’abonnement DigiCom dans Firestore, puis appliquer des quotas et une limitation de débit. Le schéma complet des profils/abonnements et les règles Firestore doivent être confirmés avant d’activer ces contrôles. Tant que ces protections ne sont pas installées, ne configurez pas l’URL publique du backend.

## Tests techniques à faire avant mise en ligne
1. Ouvrir `index.html` via un serveur HTTP ou GitHub Pages (pas `file://`).
2. Se connecter avec un compte abonné autorisé.
3. Ouvrir l’espace Abonné > Ajouter un produit.
4. Vérifier l’apparition de l’assistant IA, puis essayer la génération de description et l’amélioration d’image une fois le backend sécurisé configuré.
5. Vérifier que l’image acceptée s’enregistre avec le produit et reste visible sur un autre appareil.
6. Vérifier les règles Firestore : un abonné ne doit pas pouvoir modifier les produits d’un autre abonné.
