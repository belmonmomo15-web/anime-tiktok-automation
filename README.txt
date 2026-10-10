ANIME QUOTES — RECOMMANDATION MUSICALE (VERSION À INTÉGRER)

CONTENU
- music-recommender.js : moteur de recommandation local, sans clé API.
- integration-example.js : exemple de test et d’intégration.

INSTALLATION SUR TÉLÉPHONE
1. Télécharge et décompresse le ZIP.
2. Ouvre ton dépôt GitHub anime-tiktok-automation.
3. Ajoute le fichier music-recommender.js à la racine (même niveau que index.js).
4. Ne remplace pas index.js automatiquement : le code exact de ton fichier actuel doit être raccordé au moteur pour transmettre la vraie citation, l’anime et le personnage.
5. Pour tester, utilise temporairement integration-example.js comme référence ou ajoute son import et son appel à ton index.js.
6. Commit les changements. Railway redéploiera si le dépôt est déjà connecté.

IMPORTANT
- Ce module n’utilise pas d’API payante et fonctionne hors ligne.
- Les recommandations de titres sont des recherches suggérées, pas des résultats de catalogue vérifiés en direct. Il n’invente donc pas un artiste ou un titre précis lorsque ceux-ci ne sont pas confirmés.
- Il ne télécharge pas de musique, ne crée pas de vidéo avec audio et n’ajoute pas automatiquement un son TikTok.
- Vérifie la disponibilité du son et les droits applicables avant publication.
- Le branchement complet nécessite d’ajouter l’appel recommendMusic({quote, anime, character}) à l’endroit où index.js prépare la citation. Le fichier actuel index.js n’est pas inclus ici afin d’éviter d’écraser tes automatisations existantes.
