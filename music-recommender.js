'use strict';

/**
 * ANIME QUOTES — local music recommender.
 * No API key required. Suggestions are search ideas, not a guarantee that a
 * track is available in TikTok's music library or licensed for every use.
 */

const PROFILES = [
  {
    id: 'sad', label: 'Tristesse / solitude / perte',
    keywords: ['sad', 'triste', 'tristesse', 'pleure', 'pleurer', 'larmes', 'solitude', 'seul', 'seule', 'perdu', 'perte', 'mort', 'adieu', 'douleur', 'souffrance', 'sacrifice', 'regret', 'lonely', 'pain', 'death', 'goodbye', 'tears'],
    style: 'Piano mélancolique ou instrumental ambient lent',
    searches: ['sad anime piano instrumental', 'Naruto Sadness and Sorrow instrumental'],
    why: 'Un tempo lent et un piano discret renforcent la mélancolie sans couvrir la citation.'
  },
  {
    id: 'motivation', label: 'Motivation / espoir / dépassement de soi',
    keywords: ['espoir', 'courage', 'continue', 'jamais', 'abandonne', 'abandonner', 'objectif', 'rêve', 'reve', 'réussir', 'reussir', 'force', 'croire', 'avenir', 'détermination', 'determination', 'motivation', 'hope', 'dream', 'strong', 'never give up', 'hokage'],
    style: 'Instrumental épique japonais ou orchestral inspirant',
    searches: ['inspiring anime orchestral instrumental', 'Naruto heroic instrumental'],
    why: 'Une montée orchestrale soutient le message de courage et de progression.'
  },
  {
    id: 'power', label: 'Puissance / confiance / combat',
    keywords: ['puissance', 'puissant', 'puissante', 'roi', 'reine', 'dominer', 'force', 'combat', 'battre', 'vaincre', 'invincible', 'pouvoir', 'colère', 'colere', 'rage', 'vengeance', 'éveil', 'eveil', 'strong', 'power', 'fight', 'king', 'battle', 'revenge'],
    style: 'Phonk énergique ou instrumental épique sombre',
    searches: ['anime phonk edit', 'dark epic anime instrumental'],
    why: 'Des basses marquées et un rythme énergique accentuent l’intensité du message.'
  },
  {
    id: 'love', label: 'Amour / tendresse / nostalgie',
    keywords: ['amour', 'aimer', 'coeur', 'cœur', 'chérie', 'cherie', 'romance', 'amoureux', 'amoureuse', 'tendresse', 'ensemble', 'manque', 'miss you', 'love', 'heart', 'kiss'],
    style: 'Piano romantique ou lo-fi doux',
    searches: ['romantic anime piano instrumental', 'soft anime lo-fi'],
    why: 'Une ambiance douce laisse la place aux mots et à l’émotion romantique.'
  },
  {
    id: 'dark', label: 'Mystère / stratégie / tension',
    keywords: ['secret', 'mensonge', 'mensonges', 'ombre', 'ténèbres', 'tenebres', 'intelligence', 'stratégie', 'strategie', 'manipuler', 'justice', 'peur', 'mystère', 'mystere', 'dark', 'secret', 'fear', 'death note', 'plan'],
    style: 'Instrumental sombre, suspense ou ambient cinématique',
    searches: ['dark anime suspense instrumental', 'Death Note L theme instrumental'],
    why: 'Une ambiance tendue et discrète accompagne les citations mystérieuses ou stratégiques.'
  },
  {
    id: 'anger', label: 'Colère / révolte / liberté',
    keywords: ['liberté', 'liberte', 'révolte', 'revolte', 'haine', 'colère', 'colere', 'injustice', 'ennemi', 'ennemis', 'rébellion', 'rebellion', 'rage', 'freedom', 'hate', 'enemy', 'revenge'],
    style: 'Rock épique ou instrumental cinématique intense',
    searches: ['Attack on Titan epic instrumental', 'anime cinematic rock instrumental'],
    why: 'Une progression puissante souligne la tension, la révolte ou la quête de liberté.'
  }
];

const ANIME_HINTS = [
  { terms: ['naruto', 'hokage', 'uchiha', 'itachi', 'sasuke', 'kakashi'], anime: 'Naruto', searches: ['Naruto OST instrumental', 'Naruto Sadness and Sorrow instrumental'] },
  { terms: ['death note', 'light yagami', 'l lawliet', 'ryuk'], anime: 'Death Note', searches: ['Death Note OST instrumental', 'Death Note L theme instrumental'] },
  { terms: ['demon slayer', 'kimetsu', 'tanjiro', 'nezuko', 'zenitsu', 'inosuke'], anime: 'Demon Slayer', searches: ['Demon Slayer soundtrack instrumental', 'Demon Slayer epic instrumental'] },
  { terms: ['jujutsu kaisen', 'gojo', 'sukuna', 'yuji itadori', 'megumi'], anime: 'Jujutsu Kaisen', searches: ['Jujutsu Kaisen OST instrumental', 'Jujutsu Kaisen battle instrumental'] },
  { terms: ['attack on titan', 'eren', 'mikasa', 'levi', 'shingeki'], anime: 'Attack on Titan', searches: ['Attack on Titan soundtrack instrumental', 'Attack on Titan epic instrumental'] },
  { terms: ['one piece', 'luffy', 'zoro', 'sanji'], anime: 'One Piece', searches: ['One Piece soundtrack instrumental', 'One Piece epic instrumental'] },
  { terms: ['dragon ball', 'goku', 'vegeta', 'gohan'], anime: 'Dragon Ball', searches: ['Dragon Ball soundtrack instrumental', 'Dragon Ball battle music'] }
];

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ' ');
}

function scoreProfile(profile, text) {
  const haystack = normalize(text);
  return profile.keywords.reduce((score, keyword) => {
    const needle = normalize(keyword);
    return score + (needle && haystack.includes(needle) ? (needle.includes(' ') ? 2 : 1) : 0);
  }, 0);
}

function recommendMusic({ quote = '', anime = '', character = '' } = {}) {
  const combined = `${anime} ${character} ${quote}`.trim();
  const scored = PROFILES.map(profile => ({ profile, score: scoreProfile(profile, combined) }))
    .sort((a, b) => b.score - a.score);
  const winner = scored[0];
  const emotion = winner && winner.score > 0 ? winner.profile : {
    label: 'Émotion à confirmer',
    style: 'Instrumental anime lo-fi ou orchestral modéré',
    searches: ['anime instrumental background music', 'anime lo-fi instrumental'],
    why: 'La citation ne contient pas assez d’indices émotionnels clairs ; une ambiance neutre est proposée.'
  };

  const normalized = normalize(combined);
  const animeMatch = ANIME_HINTS.find(item => item.terms.some(term => normalized.includes(normalize(term))));
  const animeName = anime || (animeMatch ? animeMatch.anime : 'Anime non identifié');
  const trackSearches = [...(animeMatch ? animeMatch.searches : []), ...emotion.searches]
    .filter((value, index, arr) => arr.indexOf(value) === index).slice(0, 4);

  return {
    anime: animeName,
    character: character || 'Non précisé',
    quote: String(quote || ''),
    emotion: emotion.label,
    musicalStyle: emotion.style,
    trackSuggestions: trackSearches,
    reason: emotion.why,
    tiktokSearchTip: `Dans TikTok, recherche : “${trackSearches[0]}”, puis vérifie le titre, l’artiste et la disponibilité du son.`,
    note: 'Suggestions de recherche uniquement : aucun morceau n’est ajouté automatiquement et la disponibilité/licence doit être vérifiée dans TikTok.'
  };
}

function formatMusicRecommendation(result) {
  return [
    '🎵 RECOMMANDATION MUSICALE',
    `🎭 Anime : ${result.anime}`,
    `👤 Personnage : ${result.character}`,
    `🧠 Émotion : ${result.emotion}`,
    `🎶 Style : ${result.musicalStyle}`,
    '🔎 Recherches de morceaux :',
    ...result.trackSuggestions.map((item, index) => `${index + 1}. ${item}`),
    `💡 Pourquoi : ${result.reason}`,
    `📱 TikTok : ${result.tiktokSearchTip}`,
    `ℹ️ ${result.note}`
  ].join('\n');
}

module.exports = { recommendMusic, formatMusicRecommendation };
