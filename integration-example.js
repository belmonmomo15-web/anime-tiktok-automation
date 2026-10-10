// Exemple d’intégration dans index.js — ne remplace pas ton index.js actuel.
// 1) Copie music-recommender.js à la racine du projet.
// 2) Ajoute cet import en haut de index.js :
// const { recommendMusic, formatMusicRecommendation } = require('./music-recommender');
// 3) Après avoir préparé ta citation, appelle la fonction comme ci-dessous :

const { recommendMusic, formatMusicRecommendation } = require('./music-recommender');

const recommendation = recommendMusic({
  quote: 'Un jour, je deviendrai Hokage !',
  anime: 'Naruto',
  character: 'Naruto Uzumaki'
});

console.log(formatMusicRecommendation(recommendation));
// Pour intégrer au fichier de publication, tu peux sauvegarder l’objet :
// fs.writeFileSync(outputPath, JSON.stringify({ quote, caption, music: recommendation }, null, 2));
