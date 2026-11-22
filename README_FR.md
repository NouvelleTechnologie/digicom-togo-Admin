# DigiCom-Togo — Module IA vendeur (base solide)

Ce paquet prépare **deux fonctions** dans l'espace vendeur :
1. Génération d'une description de produit modifiable.
2. Amélioration de photo avec comparaison original/résultat et validation par le vendeur.

## Important : limites de l'environnement actuel
- GitHub Pages héberge uniquement le frontend statique. Il ne peut pas garder une clé OpenAI secrète ni exécuter ce backend Node.
- Le frontend fonctionne sans backend pour choisir une image, afficher l'original et préparer l'aperçu, mais le traitement IA réel nécessite un endpoint backend.
- Aucune clé secrète n'est incluse. N'en ajoutez jamais dans les fichiers du frontend ou dans GitHub.
- Ce paquet est un module autonome d'intégration, pas un remplacement complet de l'application DigiCom ni un ZIP déjà fusionné avec le site publié.
- Le backend exemple ci-joint n'est pas encore prêt à être exposé publiquement : il faut ajouter vérification Firebase ID token, contrôle d'abonnement, quotas et limitation de débit avant la production.

## Fichiers
- `frontend/DigiComAssistantIA.jsx` : composant React complet avec génération de description, sélection d'image, comparaison, acceptation/refus et messages d'erreur.
- `frontend/digicom-assistant-ia.css` : interface responsive.
- `frontend/aiClient.js` : appels au backend, sans clé secrète.
- `frontend/.env.example` : URL publique du backend seulement.
- `backend/server.js` : exemple d'API Node.js pour descriptions et traitement image OpenAI.
- `backend/package.json` : dépendances backend.
- `backend/.env.example` : emplacement local/serveur de la clé secrète.
- `docs/INTEGRATION.md` : instructions de raccordement au formulaire abonné.

## Intégration React
Importer `DigiComAssistantIA` et lui fournir :
- `nom`, `prix`, `categorie` ;
- `description` et `onDescriptionChange` ;
- `onImageReady(file, dataUrl)` appelé quand le vendeur accepte l'image améliorée.

Le composant est volontairement indépendant afin de pouvoir l'insérer dans `FormProduit`. Les noms des états sont à adapter au code source réel.

## Variables frontend
Dans `.env` de l'application Vite, ajouter :
`VITE_DIGICOM_AI_API_URL=https://votre-backend.example.com`

C'est uniquement l'URL du backend. **Ne mettez jamais `OPENAI_API_KEY` dans Vite ou dans GitHub Pages.**

## Backend
Dans le dossier `backend` :
1. `npm install`
2. Copier `.env.example` en `.env` sur un environnement serveur privé.
3. Définir `OPENAI_API_KEY`, `FRONTEND_ORIGIN` et `OPENAI_MODEL`.
4. `npm start`

Le backend de démonstration est bloqué par défaut si la clé manque. Avant tout déploiement public, ajoutez l'authentification Firebase et les contrôles anti-abus.

## Fonctionnement sans hébergement
Sans backend, l'interface reste utilisable pour sélectionner et comparer des images, mais les boutons IA afficheront un message explicatif. Les transformations IA réelles ne peuvent pas être exécutées uniquement par GitHub Pages de façon sûre.
