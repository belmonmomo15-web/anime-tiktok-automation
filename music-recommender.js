// Recommandation musicale locale pour ANIME QUOTES.
// Aucun appel API, aucune clé secrète et aucune musique téléchargée.
// Les titres précis sont présentés comme pistes de recherche, pas comme disponibilité garantie.

const RULES = [
  { label: "tristesse / deuil / solitude", terms: ["triste","tristesse","seul","solitude","perdu","perte","mort","pleure","larmes","souffrance","douleur","regret","adieu","sacrifice"], style: "Piano mélancolique / ambient", searches: ["anime sad piano instrumental", "Naruto sadness and sorrow instrumental"], reason: "Le piano lent laisse respirer l'émotion et les paroles." },
  { label: "amour / tendresse", terms: ["amour","aime","coeur","cœur","aimer","bien-aim","romance","ensemble","tendresse","manque"], style: "Piano romantique / lo-fi doux", searches: ["romantic anime piano instrumental", "soft anime lo-fi instrumental"], reason: "Une ambiance douce souligne la tendresse sans prendre le dessus sur la citation." },
  { label: "colère / vengeance", terms: ["colère","haine","vengeance","détruire","ennemi","rage","combat","punir"], style: "Phonk sombre / orchestral dramatique", searches: ["dark anime phonk", "dark cinematic anime instrumental"], reason: "Une rythmique sombre accentue la tension et la détermination." },
  { label: "motivation / détermination", terms: ["jamais","abandonner","réussir","objectif","rêve","croire","force","continuer","demain","devenir","protéger","détermination","espoir"], style: "Instrumental épique / orchestral japonais", searches: ["inspiring anime orchestral instrumental", "epic Japanese cinematic instrumental"], reason: "Une montée épique accompagne l'effort, l'espoir et le dépassement de soi." },
  { label: "puissance / confiance", terms: ["puissant","puissance","fort","force","roi","gagner","invincible","pouvoir","légende","supérieur"], style: "Phonk énergique / trap cinématique", searches: ["anime phonk edit", "cinematic trap instrumental"], reason: "Une pulsation marquée renforce l'impression de puissance." },
  { label: "mystère / intelligence", terms: ["secret","vérité","mensonge","esprit","intelligence","stratégie","ombre","justice","destin","choix"], style: "Dark ambient / suspense électronique", searches: ["dark anime suspense soundtrack", "mysterious cinematic ambient"], reason: "Les textures sombres et le suspense correspondent à une citation énigmatique." }
];

const ANIME_HINTS = [
  { names: ["naruto","sasuke","itachi","jiraiya","hokage"], searches: ["Naruto Shippuden soundtrack instrumental"] },
  { names: ["death note","light yagami","l"], searches: ["Death Note soundtrack instrumental"] },
  { names: ["demon slayer","kimetsu","tanjiro","nezuko"], searches: ["Demon Slayer instrumental soundtrack"] },
  { names: ["jujutsu kaisen","gojo","sukuna","itadori"], searches: ["Jujutsu Kaisen soundtrack instrumental"] },
  { names: ["attack on titan","shingeki","eren","levi"], searches: ["Attack on Titan soundtrack instrumental"] },
  { names: ["one piece","luffy","zoro","sanji"], searches: ["One Piece soundtrack instrumental"] },
  { names: ["dragon ball","goku","vegeta"], searches: ["Dragon Ball soundtrack instrumental"] }
];

function recommendMusic(item = {}) {
  const quote = String(item.quote || "");
  const anime = String(item.anime || "");
  const character = String(item.character || "");
  const text = `${quote} ${anime} ${character}`.toLocaleLowerCase("fr");
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ranked = RULES.map(rule => ({
    rule,
    score: rule.terms.reduce((n, term) => {
      const t = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return n + (normalized.includes(t) ? 1 : 0);
    }, 0)
  })).sort((a,b) => b.score - a.score);

  const match = ranked[0].score > 0 ? ranked[0].rule : {
    label: "ambiance générale / inspiration",
    style: "Instrumental anime cinématique",
    searches: ["anime cinematic instrumental", "anime emotional background music"],
    reason: "Aucun indice émotionnel dominant n'a été détecté : une ambiance cinématique polyvalente est proposée."
  };

  const animeMatch = ANIME_HINTS.find(entry =>
    entry.names.some(name => text.includes(name))
  );

  const searches = [...new Set([
    ...match.searches,
    ...(animeMatch ? animeMatch.searches : [])
  ])];

  return {
    emotion: match.label,
    style: match.style,
    trackSuggestion: "Aucun morceau précis confirmé automatiquement : recherche les suggestions ci-dessous et vérifie le titre, l'artiste et la disponibilité.",
    searchSuggestions: searches,
    reason: match.reason,
    note: "Recommandation indicative. Vérifie les droits d'utilisation et la disponibilité du son dans TikTok avant publication."
  };
}

module.exports = { recommendMusic };
