require("dotenv").config();

const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const axios = require("axios");
const express = require("express");
const { createCanvas, loadImage } = require("canvas");
const { recommendMusic } = require("./music-recommender");
const setupTikTokOAuth = require("./oauth-server");

// ======================================
// CONFIGURATION
// ======================================

const TIMEZONE = process.env.TIMEZONE || "Africa/Douala";
const OUTPUT_DIR = path.join(__dirname, "output");

const PORT = Number(process.env.PORT) || 3000;

const HF_ENABLED =
  String(process.env.HF_IMAGE_ENABLED || "false").toLowerCase() === "true";

const HF_TOKEN = process.env.HF_TOKEN || "";

const HF_MODEL =
  process.env.HF_IMAGE_MODEL ||
  "stabilityai/stable-diffusion-3-medium-diffusers";

const QUOTE_FILES = [
  "quotes_4200_fr_en_no_duplicates.json",
  "quotes_mixed_fr_en.json",
  "quotes.json"
];

// ======================================
// 24 STYLES TYPOGRAPHIQUES
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
  { name: "Militaire", family: "sans-serif", weight: "bold", italic: true, color: "#e4e9c7", shadow: "#333d20" },
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
    throw new Error("Le fichier JSON doit contenir une liste de citations.");
  }

  const quotes = data.filter(
    item =>
      item &&
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
// CHOIX D'UNE CITATION SANS RÉPÉTITION
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

  const pool = options.length > 0 ? options : quotes;
  const item = pool[Math.floor(Math.random() * pool.length)];

  fs.writeFileSync(
    historyPath,
    String(item.id ?? item.quote),
    "utf8"
  );

  return item;
}

// ======================================
// CHOIX DU STYLE TYPOGRAPHIQUE
// ======================================

function chooseFontStyle() {
  const historyPath = path.join(OUTPUT_DIR, "last-font-style.txt");

  let last = "";

  try {
    last = fs.readFileSync(historyPath, "utf8").trim();
  } catch (_) {}

  const options = FONT_STYLES.filter(style => style.name !== last);
  const pool = options.length > 0 ? options : FONT_STYLES;
  const style = pool[Math.floor(Math.random() * pool.length)];

  fs.writeFileSync(historyPath, style.name, "utf8");

  return style;
}

// ======================================
// GÉNÉRATION DU FOND AVEC HUGGING FACE
// ======================================

async function generateAiBackground(item) {
  if (!HF_ENABLED || !HF_TOKEN) {
    if (HF_ENABLED && !HF_TOKEN) {
      console.log("ℹ️ HF_TOKEN absent : fond graphique local utilisé.");
    }

    return null;
  }

  const subject = [item.anime, item.character]
    .filter(Boolean)
    .join(", ");

  const prompt = [
    "Vertical 9:16 cinematic anime-inspired illustration.",
    subject ? `Visual inspiration: ${subject}.` : "Original fantasy anime scenery.",
    "Beautiful detailed anime art, dramatic cinematic lighting,",
    "deep blue and violet colors with subtle cyan highlights,",
    "atmospheric depth, professional digital illustration.",
    "Keep the center dark and uncluttered for readable quote text.",
    "No text, no letters, no watermark, no logo."
  ].join(" ");

  try {
    console.log("🎨 Demande de génération à Hugging Face...");

    const response = await axios.post(
      "https://router.huggingface.co/hf-inference/models/" + HF_MODEL,
      {
        inputs: prompt,
        parameters: {
          width: 768,
          height: 1360,
          num_inference_steps: 25
        }
      },
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "image/png"
        },
        responseType: "arraybuffer",
        timeout: 120000,
        maxContentLength: 20 * 1024 * 1024
      }
    );

    const buffer = Buffer.from(response.data);

    if (!buffer.length) {
      throw new Error("L'image reçue est vide.");
    }

    const image = await loadImage(buffer);

    console.log("✅ Fond IA reçu.");

    return image;
  } catch (error) {
    const status = error.response?.status;

    console.error(
      "⚠️ Génération IA indisponible" +
      (status ? ` (HTTP ${status})` : "") +
      ". Le fond graphique local sera utilisé."
    );

    if (status === 401 || status === 403) {
      console.error("Vérifie les permissions du token Hugging Face.");
    } else if (status === 402 || status === 429) {
      console.error("Vérifie les crédits et les limites d'utilisation.");
    } else if (status === 503) {
      console.error("Le modèle est peut-être en cours de chargement.");
    }

    return null;
  }
}

// ======================================
// RETOUR À LA LIGNE
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

  if (line) {
    lines.push(line);
  }

  return lines;
}

// ======================================
// CRÉATION DE L'IMAGE VERTICALE
// ======================================

async function createImage(item, outputPath, style) {
  const width = 1080;
  const height = 1920;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const aiBackground = await generateAiBackground(item);

  if (aiBackground) {
    ctx.drawImage(aiBackground, 0, 0, width, height);
    ctx.fillStyle = "rgba(5, 8, 24, 0.42)";
    ctx.fillRect(0, 0, width, height);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, width, height);

    gradient.addColorStop(0, "#101326");
    gradient.addColorStop(0.5, "#302047");
    gradient.addColorStop(1, "#071d2b");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

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

  // Étoiles
  for (let i = 0; i < 65; i++) {
    ctx.beginPath();
    ctx.arc((i * 137) % width, (i * 263) % height, (i % 3) + 2, 0, Math.PI * 2);
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

  // Personnage
  ctx.fillStyle = style.color;
  ctx.shadowColor = style.shadow;
  ctx.shadowBlur = 12;
  ctx.font = `${style.italic ? "italic " : ""}${style.weight} 46px ${style.family}`;

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
    ctx.font = `${style.italic ? "italic " : ""}${style.weight} ${fontSize}px ${style.family}`;
    lines = wrapText(ctx, quote, 820);

    if (lines.length <= 10) {
      break;
    }

    fontSize -= 4;
  }

  ctx.font = `${style.italic ? "italic " : ""}${style.weight} ${fontSize}px ${style.family}`;
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

  await fs.promises.writeFile(outputPath, canvas.toBuffer("image/png"));
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

  return (
    `${item.character ? item.character + " • " : ""}` +
    `${item.anime || "Anime"}\n${quote}\n\n${hashtags}`
  );
}

// ======================================
// RECOMMANDATION MUSICALE
// ======================================

function getMusicRecommendation(item) {
  try {
    const result = recommendMusic(item);

    if (!result || typeof result !== "object") {
      throw new Error("Résultat musical invalide.");
    }

    return {
      ...result,
      style: result.style || "Instrumental adapté à l'émotion",
      emotion: result.emotion || "Émotion générale",
      searchSuggestions: Array.isArray(result.searchSuggestions)
        ? result.searchSuggestions
        : [],
      reason: result.reason || "Suggestion basée sur la citation."
    };
  } catch (error) {
    console.error("⚠️ Recommandation musicale indisponible :", error.message);

    return {
      style: "Instrumental anime",
      emotion: "Inconnue",
      searchSuggestions: [
        `${item.anime || "anime"} instrumental soundtrack`,
        "anime emotional instrumental music"
      ],
      reason: "Suggestion de secours."
    };
  }
}

// ======================================
// GÉNÉRATION D'UNE PUBLICATION
// ======================================

async function generatePost() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const quotes = loadQuotes();
  const item = chooseQuote(quotes);
  const style = chooseFontStyle();
  const music = getMusicRecommendation(item);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const imageName = `anime-quote-${stamp}.png`;
  const imagePath = path.join(OUTPUT_DIR, imageName);

  await createImage(item, imagePath, style);

  const metadata = {
    createdAt: new Date().toISOString(),
    quoteId: item.id ?? null,
    fontStyle: style.name,
    aiBackgroundEnabled: HF_ENABLED,
    character: item.character ?? null,
    anime: item.anime ?? null,
    quote: item.quote,
    caption: makeCaption(item),
    image: imageName,
    musicRecommendation: music,
    musicStyle: music.style,
    musicEmotion: music.emotion,
    musicSearchSuggestions: music.searchSuggestions,
    musicReason: music.reason,
    requestedLocation: null,
    note:
      "La musique est une recommandation uniquement. " +
      "Vérifie les droits d'utilisation. " +
      "La publication TikTok automatique n'est pas encore activée."
  };

  const metadataPath = imagePath.replace(/\.png$/, ".json");

  await fs.promises.writeFile(
    metadataPath,
    JSON.stringify(metadata, null, 2),
    "utf8"
  );

  console.log("==================================");
  console.log(`🖼️ Image créée : ${imageName}`);
  console.log(`🎨 Style graphique : ${style.name}`);
  console.log(`🎭 Anime : ${item.anime || "Non précisé"}`);
  console.log(`👤 Personnage : ${item.character || "Non précisé"}`);
  console.log(`📝 Citation : ${item.quote}`);
  console.log(`📄 Légende : ${metadata.caption}`);
  console.log(`🎵 Style musical : ${music.style}`);
  console.log(`🧠 Émotion : ${music.emotion}`);
  console.log(`🔎 Recherches : ${music.searchSuggestions.join(" | ")}`);
  console.log("==================================");
}

// ======================================
// GESTION DES ERREURS
// ======================================

async function safeGenerate() {
  try {
    await generatePost();
  } catch (error) {
    console.error("❌ Erreur de génération :", error.message);
  }
}

// ======================================
// SERVEUR WEB ET CONNEXION TIKTOK
// ======================================

const app = express();

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Anime TikTok Automation</title>
    </head>
    <body style="font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:20px">
      <h1>Anime TikTok Automation</h1>
      <p>Le serveur fonctionne.</p>
      <p><a href="/auth/tiktok">Connecter mon compte TikTok</a></p>
    </body>
    </html>
  `);
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "anime-tiktok-automation",
    time: new Date().toISOString()
  });
});

// Enregistre les routes définies dans oauth-server.js.
setupTikTokOAuth(app);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Serveur web actif sur le port ${PORT}`);
});

// ======================================
// DÉMARRAGE ET PROGRAMMATION
// ======================================

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("🎌 BOT ANIME TIKTOK DÉMARRÉ");
  console.log(`🕒 Fuseau horaire : ${TIMEZONE}`);
  console.log(`🎨 Styles disponibles : ${FONT_STYLES.length}`);
  console.log(`🧠 Génération IA : ${HF_ENABLED ? "activée" : "désactivée"}`);

  if (HF_ENABLED && !HF_TOKEN) {
    console.log("⚠️ HF_IMAGE_ENABLED est actif, mais HF_TOKEN est absent.");
  }

  await safeGenerate();

  cron.schedule("0 1 * * *", safeGenerate, { timezone: TIMEZONE });
  cron.schedule("0 13 * * *", safeGenerate, { timezone: TIMEZONE });
  cron.schedule("0 19 * * *", safeGenerate, { timezone: TIMEZONE });

  console.log("✅ Générations programmées : 01 h, 13 h et 19 h.");
  console.log("ℹ️ La publication TikTok automatique n'est pas encore activée.");
}

main().catch(error => {
  console.error("❌ Erreur au démarrage :", error.message);
});

// ======================================
// ARRÊT PROPRE
// ======================================

async function shutdown(signal) {
  console.log(`Arrêt demandé (${signal}).`);

  server.close(() => {
    console.log("Serveur web arrêté.");
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
