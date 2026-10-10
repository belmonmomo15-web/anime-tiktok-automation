ANIME QUOTES — INTÉGRATION DE LA RECOMMANDATION MUSICALE

Fichier fourni :
- music-recommender.js : analyse locale de la citation/anime/personnage et propose émotion, style, recherches de morceaux et explication.

INSTALLATION SUR TÉLÉPHONE
1. Télécharge et décompresse le ZIP.
2. Dans le dépôt GitHub anime-tiktok-automation, ajoute music-recommender.js à la racine (au même niveau que index.js).
3. Ouvre index.js et fais les deux petites modifications ci-dessous. Ne remplace pas index.js entier.

MODIFICATION 1 — avec les autres require, ajoute :
const { recommendMusic } = require("./music-recommender");

MODIFICATION 2 — dans generatePost(), juste après :
const style = chooseFontStyle();
ajoute :
const music = recommendMusic(item);

MODIFICATION 3 — dans l'objet metadata, ajoute ces champs :
musicRecommendation: music,
musicStyle: music.style,
musicSearchSuggestions: music.searchSuggestions,

MODIFICATION 4 — dans les logs de fin de generatePost(), avant la ligne de séparation finale, ajoute :
console.log(`🎵 Style musical : ${music.style}`);
console.log(`🧠 Émotion : ${music.emotion}`);
console.log(`🔎 Recherches musicales : ${music.searchSuggestions.join(" | ")}`);

Puis Commit changes. Railway devrait redéployer si le dépôt est connecté.

RÉSULTAT
Chaque génération ajoute les recommandations dans le fichier JSON voisin de l'image, par exemple :
output/anime-quote-....png
output/anime-quote-....json

IMPORTANT
- Cette fonctionnalité ne télécharge pas de musique et ne l'ajoute pas à l'image.
- Les recherches proposées sont des suggestions, pas une confirmation de disponibilité ou de droits.
- Elle ne publie pas automatiquement sur TikTok.
- Les fichiers générés dans output peuvent disparaître lors d'un redéploiement ou redémarrage Railway selon la configuration du stockage.
- Le choix est fait par mots-clés locaux : c'est une première version heuristique, pas une IA qui comprend parfaitement le contexte.
