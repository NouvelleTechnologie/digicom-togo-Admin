# DigiCom — intégration de l'assistant IA

## Interface fournie
- L'assistant IA est raccordé au formulaire produit de l'espace Abonné.
- Il reste masqué jusqu'au clic sur « Ouvrir l'assistant IA ».
- La description proposée revient dans le champ Description.
- La photo améliorée n'est ajoutée au formulaire qu'après validation explicite du vendeur.

## Backend Gemini
Cette archive contient uniquement le frontend. Elle ne contient pas `server.js` ni `package.json` pour le service IA.
Le frontend attend une API HTTPS aux routes :
- `POST /api/generate-description`
- `POST /api/improve-image`

Après création, sécurisation et déploiement du backend Gemini, renseigner son URL dans `window.DIGICOM_AI_API_URL` dans `index.html`.

La clé `GEMINI_API_KEY` doit rester exclusivement dans les variables d'environnement du serveur. Ne jamais l'ajouter à `config.js`, `index.html`, ni à GitHub Pages.

## Sécurité obligatoire avant ouverture publique
Le backend doit vérifier le Firebase ID token avec Firebase Admin, lire le profil dans la base Firestore réellement utilisée par l'application, autoriser uniquement le rôle `abonne` actif avec abonnement valide, appliquer des quotas et une limitation de débit, limiter la taille et le type des images et restreindre CORS aux origines prévues.

Les règles Firestore doivent empêcher un vendeur de lire ou modifier les données d'un autre vendeur. Le frontend seul ne constitue jamais une barrière de sécurité.

## À vérifier sur le projet réel
- Identifiant exact de la base Firestore : le frontend appelle `getFirestore(app, 'default')`; le backend devra utiliser exactement la même base.
- Structure réelle des documents `users` et `abonnements`, notamment le champ `dateFin`.
- Règles Firestore et stockage des images.
- Compte Abonné actif et compte expiré.
- Tests depuis GitHub Pages et mobile Android.
