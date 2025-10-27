// ===============================
// IRIS 3.9.1 — index.js
// Modalità: free / book / hy (ibrida mente + libro)
// Telegram Bot + OpenAI + Qdrant + Google TTS (OGG_OPUS)
// Default: FREE MODE
// Memoria conversazionale (ultime 11 coppie) in FREE e HY
// Webhook (Render) o Polling (locale) automatici
// ===============================

import fs from "fs";
import path from "path";
import http from "http";
import express from "express";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import textToSpeech from "@google-cloud/text-to-speech";
import { fileURLToPath } from "url";

import {
  gptFreeResponse,
  ragBookAnswer,
  hybridAnswer
} from "./ragSearch.js";

dotenv.config();

// -------------------------------
// Paths & setup
// -------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");

if (!TELEGRAM_TOKEN) {
  console.error("❌  TELEGRAM_TOKEN mancante nelle variabili d'ambiente.");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("❌  OPENAI_API_KEY mancante nelle variabili d'ambiente.");
  process.exit(1);
}

// -------------------------------
// Inizializzazione TTS (Google) — OGG_OPUS
// -------------------------------
const ttsClient = new textToSpeech.TextToSpeechClient();
async function synthToOgg(text, outfile) {
  // Rimuove il fulmine per evitare lettura “alta tensione”
  const clean = (text || "").replace(/⚡/g, "").trim() || " ";
  const [resp] = await ttsClient.synthesizeSpeech({
    input: { text: clean },
    voice: { languageCode: "it-IT", ssmlGender: "FEMALE" },
    audioConfig: { audioEncoding: "OGG_OPUS" }
  });
  fs.writeFileSync(outfile, resp.audioContent, "binary");
  return outfile;
}

// -------------------------------
// Memoria modalità (persistente su file)
// -------------------------------
const MODE_FILE = path.join(__dirname, "iris_mode.txt");
function loadMode() {
  try {
    if (fs.existsSync(MODE_FILE)) {
      const m = fs.readFileSync(MODE_FILE, "utf-8").trim();
      if (["free", "book", "hy"].includes(m)) return m;
    }
  } catch (_) {}
  fs.writeFileSync(MODE_FILE, "free"); // default desiderato
  return "free";
}
function saveMode(mode) {
  try { fs.writeFileSync(MODE_FILE, mode); } catch (e) {}
}
let irisMode = loadMode();

// -------------------------------
// Memoria conversazionale in RAM (ultime 11 coppie)
// Map chatId -> [{role:"user"/"assistant", content:String}, ...]
// Usata in FREE e HY, non in BOOK
// -------------------------------
const MAX_TURNS = 11;
const convMemory = new Map();
function pushTurn(chatId, role, content) {
  if (!content) return;
  const arr = convMemory.get(chatId) || [];
  arr.push({ role, content: String(content).slice(0, 1500) });
  // Mantieni ultime 11 coppie ~ 22 messaggi
  while (arr.length > MAX_TURNS * 2) arr.shift();
  convMemory.set(chatId, arr);
}
function getHistory(chatId) {
  return convMemory.get(chatId) || [];
}

// -------------------------------
// Telegram bot + Server
// -------------------------------
const app = express();
app.use(express.json());

let bot;
if (PUBLIC_BASE_URL) {
  // Webhook (Render)
  bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: true });
  const webhookUrl = `${PUBLIC_BASE_URL}/bot${TELEGRAM_TOKEN}`;

  setTimeout(() => {
    bot.setWebHook(webhookUrl)
      .then(() => {
        console.log("☁  Ambiente Render attivo su porta " + PORT);
        console.log("🤖  Webhook impostato su: " + webhookUrl);
        console.log("🧭  Modalità iniziale: WEBHOOK");
        console.log("💠  IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
      })
      .catch(err => {
        console.error("❌  Errore setWebHook:", err?.message || err);
      });
  }, 5000);

  app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
} else {
  // Polling (Locale)
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  console.log("💻  Ambiente locale — polling attivo");
  console.log("🧭  Modalità iniziale: POLLING");
  console.log("💠  IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
}

// Health endpoints
app.get("/", (_, res) => res.status(200).send("IRIS 3.9.1 — ok"));
http.createServer(app).listen(PORT, () => {
  console.log("🌍  Server attivo su porta " + PORT);
});

// -------------------------------
// Comandi
// -------------------------------
bot.onText(/^\/start$/, async (msg) => {
  const chatId = String(msg.chat.id);
  await bot.sendMessage(chatId,
    "Ciao, sono IRIS. 🌿\n" +
    "Modalità disponibili:\n" +
    "• /free — dialogo libero (empatico e creativo)\n" +
    "• /book — solo dai libri caricati\n" +
    "• /hy — mente + libro (fusione)\n" +
    "Usa /mode per vedere lo stato attuale."
  );
});

bot.onText(/^\/help$/, (msg) => {
  const chatId = String(msg.chat.id);
  bot.sendMessage(chatId,
    "Comandi:\n" +
    "• /free — attiva FREE MODE\n" +
    "• /book — attiva BOOK MODE\n" +
    "• /hy — attiva HYBRID MODE (RAG + poetica)\n" +
    "• /mode — mostra la modalità corrente"
  );
});

bot.onText(/^\/mode$/, (msg) => {
  const chatId = String(msg.chat.id);
  const label = irisMode === "book" ? "📚  BOOK MODE" : irisMode === "hy" ? "⚗️  HYBRID MODE" : "🌀  FREE MODE";
  bot.sendMessage(chatId, `Modalità corrente: ${label}`);
});

bot.onText(/^\/free$/, (msg) => {
  irisMode = "free";
  saveMode("free");
  bot.sendMessage(msg.chat.id, "🌀  IRIS ora è in FREE MODE — dialogo libero e sensibile.");
});

bot.onText(/^\/book$/, (msg) => {
  irisMode = "book";
  saveMode("book");
  bot.sendMessage(msg.chat.id, "📚  IRIS ora è in BOOK MODE — risponde solo dai libri caricati.");
});

bot.onText(/^\/hy$/, (msg) => {
  irisMode = "hy";
  saveMode("hy");
  bot.sendMessage(msg.chat.id, "⚗️  IRIS ora è in HYBRID MODE — fusione mente + libro.");
});

// -------------------------------
// Messaggi (testo)
// -------------------------------
bot.on("message", async (msg) => {
  try {
    const chatId = String(msg.chat.id);
    const text = (msg.text || "").trim();
    if (!text || text.startsWith("/")) return;

    console.log(`📩  [${chatId}] (${irisMode}) → ${text}`);

    let answerText = "";
    if (irisMode === "book") {
      const res = await ragBookAnswer(text);
      answerText = res.text;
    } else if (irisMode === "hy") {
      const history = getHistory(chatId);
      const res = await hybridAnswer(text, history);
      answerText = res.text;
    } else {
      const history = getHistory(chatId);
      answerText = await gptFreeResponse(text, history);
    }

    // Testo
    await bot.sendMessage(chatId, answerText);

    // TTS (voce OGG)
    const tmpOgg = path.join(__dirname, "response.ogg");
    await synthToOgg(answerText, tmpOgg);
    await bot.sendVoice(chatId, fs.createReadStream(tmpOgg));

    // Memoria conversazionale (solo FREE & HY)
    if (irisMode !== "book") {
      pushTurn(chatId, "user", text);
      pushTurn(chatId, "assistant", answerText);
    }
  } catch (e) {
    console.error("❌  Errore on.message:", e?.message || e);
    try {
      await bot.sendMessage(msg.chat.id, "Ho avuto un piccolo inciampo tecnico. Riproviamo tra poco 🌿");
    } catch (_) {}
  }
});
