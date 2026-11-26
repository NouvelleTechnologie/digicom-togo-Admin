# DigiCom Admin — archive frontend de travail

Cette archive contient le frontend Admin et les espaces d'équipe associés (Abonné, Livreur, Chef, Statistiques). La plateforme Acheteur est indépendante et n'est pas intégrée à ce frontend.

## Modifications de cette passe
- Le rôle Acheteur n'est plus proposé lors de la création de comptes depuis Admin.
- Les comptes Acheteur existants sont exclus de la liste de gestion Admin.
- Le formulaire de création de compte propose Abonné par défaut.
- L'assistant IA est masqué jusqu'au clic sur « Ouvrir l'assistant IA ».
- L'URL du backend IA a été vidée pour éviter d'appeler une ancienne URL Render non vérifiée.

## Passe 2 — assistant IA fiabilisé
- aiClient.js : délai maximal, nouvel essai automatique, erreurs claires (plus de suffixe « [HTTP 502] »), réveil du serveur.
- DigiComAssistantIA.js : bouton « Réessayer », message d'attente longue, et correction d'un bug d'aperçu
  (l'image « Originale » disparaissait quand le résultat IA arrivait ; la miniature ajoutée au formulaire
  pouvait se casser à la fermeture de l'assistant).
- sw.js : cache renouvelé (v3).
- Documentation alignée sur Gemini (les mentions d'OpenAI et d'un server.js inclus ont été retirées).

## Limite importante
Le ZIP est un frontend statique. Il ne contient pas le backend Gemini, les secrets, ni la configuration Firebase de production. L'assistant IA ne fonctionnera pas tant que le backend sécurisé n'aura pas été fourni, déployé et relié.

## Déploiement frontend
Publier les fichiers du dossier `DigiCom_FRONTEND` à la racine du dépôt GitHub Pages Admin, après sauvegarde de l'ancienne version. Ne pas publier de clé Gemini.
