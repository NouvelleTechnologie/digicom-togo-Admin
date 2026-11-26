# DigiCom — intégration de l'assistant IA

## Interface fournie
- L'assistant IA est raccordé au formulaire produit de l'espace Abonné (abonne.js).
- Il reste masqué jusqu'au clic sur « Ouvrir l'assistant IA » ; à l'ouverture, il réveille le serveur IA.
- La description proposée revient dans le champ Description.
- La photo améliorée n'est ajoutée au formulaire qu'après validation explicite du vendeur.
- En cas d'erreur temporaire (serveur saturé, serveur qui démarre), un bouton « Réessayer » apparaît.
- Si l'attente dépasse 8 secondes, un message explique que le serveur peut mettre jusqu'à une minute.

## Client (aiClient.js)
- Délai maximal de 90 s par appel, un seul nouvel essai automatique (réseau coupé ou erreur 503).
- Les erreurs sont de type `ErreurIA` (`status`, `retryable`, `timeout`) ; le message vient du serveur, sans suffixe technique.
- `reveillerServeurIA()` ping `/api/health` sans bloquer.

## Backend IA
Le backend n'est pas dans cette archive (archive séparée : digicom-ai-corrige.zip, dossier `serveur/`).
Routes attendues :
- `POST /api/generate-description`  -> `{ description, fournisseur, modele }`
- `POST /api/improve-image`         -> `{ imageDataUrl, fournisseur, modele }`
- `GET  /api/health`
En cas d'erreur, le serveur renvoie `{ error, retryable }`.
Les clés (Gemini, et éventuellement Anthropic ou un service compatible OpenAI pour le secours du texte)
restent exclusivement dans les variables d'environnement du serveur.

## Sécurité (inchangé)
Le backend vérifie le Firebase ID token, le rôle `abonne` actif et l'abonnement valide, applique quotas
et limitation de débit, limite taille/type des images et restreint CORS. Les règles Firestore doivent
empêcher un vendeur de lire ou modifier les données d'un autre vendeur : le frontend seul n'est jamais une barrière.

## À vérifier sur le projet réel
- Base Firestore nommée « default » (frontend : getFirestore(app, 'default'), serveur : FIRESTORE_DATABASE_ID).
- Structure des documents `users` et `abonnements` (champ `dateFin`).
- Règles Firestore et stockage des images.
