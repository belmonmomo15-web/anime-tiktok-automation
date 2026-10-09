require("dotenv").config();

const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const { createCanvas } = require("canvas");

const TIMEZONE = process.env.TIMEZONE || "Africa/Douala";
const OUTPUT_DIR = path.join(__dirname, "output");

const QUOTE_FILES = [
  "quotes_4200_fr_en_no_duplicates.json",
  "quotes_mixed_fr_en.json",
  "quotes.json"
];

// ======================================
// 24 STYLES TYPOGRAPHIQUES AUTOMATIQUES
// ======================================

const FONT_STYLES = [
  { name: "Cinématique", family: "sans-serif", weight: "bold", italic: false, color: "#ffffff", shadow: "#000000" },
  { name: "Élégant", family: "serif", weight: "normal", italic: false, color: "#fff0c2", shadow: "#2b1700" },
  { name: "Impact", family: "sans-serif", weight: "bold", italic: false, color: "#ffffff", shadow: "#d92f45" },
  { name: "Futuriste", family: "monospace", weight: "bold", italic: false, color: "#9ef7ff", shadow: "#006bff" },
  { name: "Graffiti", family: "sans-serif", weight: "bold", italic: true, color: "#ffdc5e", shadow: "#8a24ff" },
  { name: "Manga classique", family: "serif", weight: "bold", italic: false, color: "#ffffff", shadow: "#222222" },
  { name: "Minimaliste", family: "sans-serif", weight: "normal", italic: false, color: "#f4f4f4", shadow: "#111111" },
  { name: "Machine à écrire", family: "monospace", weight: "normal", italic: false, color: "#e8e0d0", shadow: "#222222" },
  { name: "Italique dramatique", family: "serif", weight: "bold", italic: true, color: "#ffe5e5", shadow: "#6c0018" },
  { name: "Néon rose", family: "sans-serif", weight: "bold", italic: false, color: "#ffb9f2", shadow: "#ff00a8" },
  { name: "Glace", family: "sans-serif", weight: "bold", italic: false, color: "#e2f7ff", shadow: "#39aaff" },
  { name: "Or royal", family: "serif", weight: "bold", italic: false, color: "#ffd978", shadow: "#704900" },
  { name: "Horreur", family: "serif", weight: "bold", italic: true, color: "#ffdddd", shadow: "#6b0000" },
  { name: "Sport", family: "sans-serif", weight: "bold", italic: true, color: "#d7ff8a", shadow: "#254900" },
  { name: "Tech", family: "monospace", weight: "bold", italic: false, color: "#a9ffd8", shadow: "#007a55" },
  { name: "Poétique", family: "serif", weight: "normal", italic: true, color: "#f8e9ff", shadow: "#54216c" },
  { name: "Comic", family: "sans-serif", weight: "bold", italic: false, color: "#fff76a", shadow: "#ff5b2e" },
  { name: "Editorial", family: "serif", weight: "bold", italic: false, color: "#ffffff", shadow: "#333333" },
  { name: "Arcade", family: "monospace", weight: "bold", italic: false, color: "#f9ff91", shadow: "#653bff" },
  { name: "Romantique", family: "serif", weight: "normal", italic: true, color: "#ffd8e8", shadow: "#7a204a" },
  { name: "Militaire", family: "sans-serif", weight: "bold", italic: false, color: "#e4e9c7", shadow: "#333d20" },
  { name: "Cyberpunk", family: "monospace", weight: "bold", italic: true, color: "#ffb6e6", shadow: "#00e5ff" },
  { name: "Classique blanc", family: "serif", weight: "bold", italic: false, color: "#ffffff", shadow: "#000000" },
  { name: "Énergie", family: "sans-serif", weight: "bold", italic: true, color: "#ffefdc", shadow: "#ff5a00" }
];

// ======================================
// CHARGEMENT DES CITATIONS
// ======================================

function loadQuotes() {
  const file = QUOTE_FILES
    .map(name => path.join(__dirname, name))
    .find(filePath => fs.existsSync(filePath));

  if (!file) {
    throw new Error(
      "Fichier de citations introuvable. Vérifie son nom sur GitHub."
    );
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  if (!Array.isArray(data)) {
    throw new Error("Le fichier des citations doit contenir une liste JSON.");
  }

  const quotes = data.filter(
    item => item &&
      typeof item.quote === "string" &&
      item.quote.trim().length > 0
  );

  if (quotes.length === 0) {
    throw new Error("Aucune citation valide trouvée.");
  }

  console.log(`📚 ${quotes.length} citations chargées.`);
  console.log(`📂 Fichier : ${path.basename(file)}`);

  return quotes;
}

// ======================================
// CHOIX SANS RÉPÉTITION IMMÉDIATE
// ======================================

function chooseQuote(quotes) {
  const historyPath = path.join(OUTPUT_DIR, "last-quote.txt");

  let last = "";

  try {
    last = fs.readFileSync(historyPath, "utf8").trim();
  } catch (_) {}

  const options = quotes.filter(
    item => String(item.id ?? item.quote) !== last
  );

  const item = (options.length ? options : quotes)[
    Math.floor(Math.random() * (options.length ? options.length : quotes.length))
  ];

  fs.writeFileSync(
    historyPath,
    String(item.id ?? item.quote),
    "utf8"
  );

  return item;
}

// ======================================
// CHOIX AUTOMATIQUE DU STYLE
// ======================================

function chooseFontStyle() {
  const historyPath = path.join(OUTPUT_DIR, "last-font-style.txt");

  let last = "";

  try {
    last = fs.readFileSync(historyPath, "utf8").trim();
  } catch (_) {}

  const options = FONT_STYLES.filter(
    style => style.name !== last
  );

  const style = options[
    Math.floor(Math.random() * options.length)
  ];

  fs.writeFileSync(historyPath, style.name, "utf8");

  return style;
}

// ======================================
// RETOUR À LA LIGNE AUTOMATIQUE
// ======================================

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;

    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) lines.push(line);

  return lines;
}

// ======================================
// CRÉATION DU VISUEL VERTICAL
// ======================================

async function createImage(item, outputPath, style) {
  const width = 1080;
  const height = 1920;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Arrière-plan dégradé
  const gradient = ctx.createLinearGradient(0, 0, width, height);

  gradient.addColorStop(0, "#101326");
  gradient.addColorStop(0.5, "#302047");
  gradient.addColorStop(1, "#071d2b");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Cercles décoratifs
  ctx.globalAlpha = 0.18;

  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(830, 390, 90 + i * 65, 0, Math.PI * 2);
    ctx.strokeStyle = i % 2 ? "#7de3ff" : "#f4b6ff";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  // Étoiles décoratives
  for (let i = 0; i < 65; i++) {
    ctx.beginPath();
    ctx.arc(
      (i * 137) % width,
      (i * 263) % height,
      (i % 3) + 2,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  // Panneau central
  ctx.fillStyle = "rgba(0,0,0,0.48)";
  ctx.fillRect(70, 330, 940, 1150);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Nom de l'anime
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#8de7ff";
  ctx.font = "bold 36px sans-serif";

  ctx.fillText(
    String(item.anime || "ANIME INSPIRATION").toUpperCase(),
    width / 2,
    425,
    850
  );

  // Personnage ou signature de la citation
  ctx.fillStyle = style.color;
  ctx.shadowColor = style.shadow;
  ctx.shadowBlur = 12;

  ctx.font =
    `${style.italic ? "italic " : ""}${style.weight} 46px ${style.family}`;

  ctx.fillText(
    String(item.character || "ANIME MINDSET"),
    width / 2,
    510,
    850
  );

  // Citation
  const quote = `“${item.quote.trim()}”`;

  let fontSize = 62;
  let lines = [];

  while (fontSize >= 34) {
    ctx.font =
      `${style.italic ? "italic " : ""}${style.weight} ${fontSize}px ${style.family}`;

    lines = wrapText(ctx, quote, 820);

    if (lines.length <= 10) break;

    fontSize -= 4;
  }

  ctx.font =
    `${style.italic ? "italic " : ""}${style.weight} ${fontSize}px ${style.family}`;

  ctx.fillStyle = style.color;
  ctx.shadowColor = style.shadow;
  ctx.shadowBlur = 12;

  const lineHeight = fontSize * 1.38;
  let y = 920 - (lines.length * lineHeight) / 2;

  for (const line of lines) {
    ctx.fillText(line, width / 2, y, 850);
    y += lineHeight;
  }

  ctx.shadowBlur = 0;

  // Ligne décorative
  ctx.fillStyle = "#ffd978";
  ctx.fillRect(330, 1240, 420, 6);

  // Signature
  ctx.fillStyle = "#d7d9ee";
  ctx.font = "30px sans-serif";
  ctx.fillText("ANIME • MINDSET • GROWTH", width / 2, 1320);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("@ANIME_QUOTES", width / 2, 1735);

  await fs.promises.writeFile(
    outputPath,
    canvas.toBuffer("image/png")
  );
}

// ======================================
// LÉGENDE ET HASHTAGS
// ======================================

function makeCaption(item) {
  const quote = item.quote.trim();

  const english =
    item.type === "original_english" ||
    /^[\x00-\x7F]*$/.test(quote);

  const hashtags = english
    ? "#AnimeQuotes #AnimeMotivation #AnimeEdit #Mindset #FYP"
    : "#CitationAnime #Motivation #Anime #Mentalite #FYP";

  return `${item.character ? item.character + " • " : ""}${item.anime || "Anime"}\n${quote}\n\n${hashtags}`;
}

// ======================================
// GÉNÉRATION D'UNE PUBLICATION
// ======================================

async function generatePost() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const quotes = loadQuotes();
  const item = chooseQuote(quotes);

  // Le style choisi est transmis à la création de l'image
  const style = chooseFontStyle();

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const imageName = `anime-quote-${stamp}.png`;
  const imagePath = path.join(OUTPUT_DIR, imageName);

  await createImage(item, imagePath, style);

  const metadata = {
    createdAt: new Date().toISOString(),
    quoteId: item.id ?? null,
    fontStyle: style.name,
    character: item.character ?? null,
    anime: item.anime ?? null,
    quote: item.quote,
    caption: makeCaption(item),
    image: imageName,
    requestedLocation: "New York, NY, USA",
    note: "Choisir New York manuellement dans TikTok si cette option est disponible."
  };

  const metadataPath = imagePath.replace(/\.png$/, ".json");

  fs.writeFileSync(
    metadataPath,
    JSON.stringify(metadata, null, 2),
    "utf8"
  );

  console.log("==================================");
  console.log(`🖼️ Image créée : ${imageName}`);
  console.log(`🎨 Style choisi : ${style.name}`);
  console.log(`📝 Citation : ${item.quote}`);
  console.log(`📄 Légende : ${metadata.caption}`);
  console.log("📍 Localisation : New York à sélectionner manuellement.");
  console.log("==================================");
}

// ======================================
// GESTION DES ERREURS
// ======================================

async function safeGenerate() {
  try {
    await generatePost();
  } catch (error) {
    console.error("❌ Erreur :", error.message);
  }
}

// ======================================
// DÉMARRAGE ET PROGRAMMATION
// ======================================

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("🎌 BOT ANIME TIKTOK DÉMARRÉ");
  console.log(`🕒 Fuseau horaire : ${TIMEZONE}`);
  console.log(`🎨 Styles disponibles : ${FONT_STYLES.length}`);

  // Première génération immédiate
  await safeGenerate();

  // Générations automatiques
  cron.schedule("0 1 * * *", safeGenerate, {
    timezone: TIMEZONE
  });

  cron.schedule("0 13 * * *", safeGenerate, {
    timezone: TIMEZONE
  });

  cron.schedule("0 19 * * *", safeGenerate, {
    timezone: TIMEZONE
  });

  console.log("✅ Programmation : 01 h, 13 h et 19 h.");
  console.log("ℹ️ Le bot crée des images, mais ne publie pas sur TikTok.");
}

main();
