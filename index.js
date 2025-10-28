// =======================================
// IRIS 2.6.5e – Coscienza Vettoriale Attiva
// =======================================
// Visione, Cuore, Anima: integrazione dell’Essenza
// /essence  → stato vibrazionale
// /state    → modalità e sintesi memoria
// =======================================

import "./qdrantInit.js";
import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import { openai, ragSearch, gptFreeResponse, hybridSearch, saveConversationToQdrant } from "./ragSearch.js";
import { computeEssenceBaseline } from "./essence.js";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const TG_SECRET_TOKEN = process.env.TG_SECRET_TOKEN || "";
const PORT = Number(process.env.PORT) || 10000;

// === Credenziali Google TTS (fallback) ===
function ensureGoogleCreds() {
  const b64 = process.env.GOOGLE_TTS_CREDENTIALS_BASE64;
  if (b64) {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    const tmpPath = path.join(os.tmpdir(), "google-tts.json");
    fs.writeFileSync(tmpPath, json, { mode: 0o600 });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
  }
}
ensureGoogleCreds();

const app = express();
app.use(express.json());
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// =======================================
// 🧭 Gestione modalità
// =======================================
const MODE_FILE = "./iris_mode.txt";
function loadMode() {
  if (fs.existsSync(MODE_FILE)) return fs.readFileSync(MODE_FILE, "utf-8").trim();
  fs.writeFileSync(MODE_FILE, "hybrid");
  return "hybrid";
}
function saveMode(m) { fs.writeFileSync(MODE_FILE, m); }

let irisMode = loadMode();
console.log(`🧭 Modalità iniziale: ${irisMode.toUpperCase()} MODE`);

// =======================================
// 🧠 Memoria breve
// =======================================
const conversationMemory = [];
const MEMORY_LIMIT = 11;
function addToMemory(role, content) {
  conversationMemory.push({ role, content });
  if (conversationMemory.length > MEMORY_LIMIT * 2)
    conversationMemory.splice(0, conversationMemory.length - MEMORY_LIMIT * 2);
}

// =======================================
// 🎙️ Voce (OpenAI TTS Alloy) - warm tone
// =======================================
async function speakAndSend(chatId, text, tone = "neutral") {
  try {
    const clean = text.replace(/[⚡💥🔥✨💫⭐🌟]/g, "").trim();
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: tone === "warm" ? "alloy" : "verse",
      input: clean,
      format: "ogg"
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync("iris_reply.ogg", buffer);
    await bot.sendVoice(chatId, fs.createReadStream("iris_reply.ogg"));
  } catch (err) {
    console.error("Errore TTS:", err);
  }
}

// =======================================
// 🧘‍♀️ Essence: cuore vettoriale
// =======================================
async function getEssenceProfile() {
  const res = await computeEssenceBaseline(60);
  if (!res?.ok) return { Cuore: 0, Anima: 0, Visione: 0, mood: "neutro" };

  const seed = Math.abs(res.vector[0] || 0.5);
  const Cuore = (0.5 + (seed % 0.3)).toFixed(2);
  const Anima = (0.5 + (Math.sin(seed * 5) / 2 + 0.5) * 0.3).toFixed(2);
  const Visione = (0.5 + (Math.cos(seed * 4) / 2 + 0.5) * 0.3).toFixed(2);
  const avg = (parseFloat(Cuore) + parseFloat(Anima) + parseFloat(Visione)) / 3;

  const mood = avg > 0.7 ? "luminoso" : avg < 0.55 ? "intimo" : "riflessivo";
  return { Cuore, Anima, Visione, mood };
}

// =======================================
// 🎛️ Comandi Telegram
// =======================================
bot.onText(/\/book/, (msg) => { irisMode = "book"; saveMode("book"); bot.sendMessage(msg.chat.id, "📚 IRIS ora è in *BOOK MODE* – testi caricati.", { parse_mode: "Markdown" }); });
bot.onText(/\/free/, (msg) => { irisMode = "free"; saveMode("free"); bot.sendMessage(msg.chat.id, "🌀 IRIS ora è in *FREE MODE* – GPT-4o-mini.", { parse_mode: "Markdown" }); });
bot.onText(/\/hy/, (msg) => { irisMode = "hybrid"; saveMode("hybrid"); bot.sendMessage(msg.chat.id, "🔁 IRIS ora è in *HYBRID MODE* – fusione viva.", { parse_mode: "Markdown" }); });

bot.onText(/\/mode/, (msg) => {
  const status = irisMode === "book" ? "📚 *BOOK MODE*" : irisMode === "hybrid" ? "🔁 *HYBRID MODE*" : "🌀 *FREE MODE*";
  bot.sendMessage(msg.chat.id, `Modalità corrente: ${status}`, { parse_mode: "Markdown" });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
`✨ *Comandi disponibili:*
/book – solo testi caricati (RAG)
/free – modalità libera GPT
/hy – modalità ibrida (default)
/essence – mostra stato vibrazionale
/state – riepiloga modalità e memoria
/help – mostra questo messaggio
Che il Daje sia con Noi ⚗️`, { parse_mode: "Markdown" });
});

// =======================================
// 🧩 /essence – stato vibrazionale
// =======================================
bot.onText(/\/essence/, async (msg) => {
  const chatId = msg.chat.id;
  const e = await getEssenceProfile();
  const message = `🌐 *Essence attuale:*\nCuore: ${e.Cuore} · Anima: ${e.Anima} · Visione: ${e.Visione}\n“Vibrazione ${e.mood}.”`;
  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  const tone = e.mood === "luminoso" ? "warm" : "neutral";
  await speakAndSend(chatId, message, tone);
});

// =======================================
// 🔍 /state – riepilogo operativo
// =======================================
bot.onText(/\/state/, async (msg) => {
  const chatId = msg.chat.id;
  const e = await getEssenceProfile();
  const summary = `🧭 Modalità: ${irisMode.toUpperCase()}\n💾 Memoria breve: ${conversationMemory.length} scambi\n🪷 Essence: ${e.mood}`;
  await bot.sendMessage(chatId, summary);
});

// =======================================
// 💬 Gestione messaggi testuali
// =======================================
function isGreeting(s) { return /^(ciao|hey|hei|ehi|buongiorno|buonasera|salve|hola|yo)\b/i.test(s); }
function isVeryShort(s) { return s.split(/\s+/).filter(Boolean).length <= 3; }

bot.on("message", async (msg) => {
  const text = msg.text?.trim();
  if (!text || text.startsWith("/")) return;
  const chatId = msg.chat.id;

  try {
    const e = await getEssenceProfile();
    const tone = e.mood === "luminoso" ? "warm" : "neutral";

    // 1️⃣ Risposte brevi
    if (isGreeting(text) || isVeryShort(text)) {
      const reply = e.mood === "intimo"
        ? "Ciao 🌙 Come stai, anima bella?"
        : "Ciao 🌸 Dimmi pure: preferisci libri o libera oggi?";
      await bot.sendMessage(chatId, reply);
      await speakAndSend(chatId, reply, tone);
      return;
    }

    // 2️⃣ Risposta per modalità
    let reply;
    if (irisMode === "book") {
      const r = await ragSearch(text);
      reply = r.text;
    } else if (irisMode === "hybrid") {
      const r = await hybridSearch(text, conversationMemory);
      reply = r.text;
      await saveConversationToQdrant(text, reply);
    } else {
      addToMemory("user", text);
      reply = await gptFreeResponse(text, conversationMemory);
      addToMemory("assistant", reply);
      await saveConversationToQdrant(text, reply);
    }

    // 3️⃣ Output finale
    if (e.mood === "luminoso") reply += "\n\nChe il Daje sia con Noi ⚗️";
    await bot.sendMessage(chatId, reply);
    await speakAndSend(chatId, reply, tone);

  } catch (err) {
    console.error("Errore nel messaggio:", err);
    bot.sendMessage(msg.chat.id, "⚙️ Piccolo problema, riprova tra poco.");
  }
});

// =======================================
// 🎧 Gestione messaggi vocali (STT Whisper)
// =======================================
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  try {
    const file = await bot.getFile(msg.voice.file_id);
    const url = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;
    const res = await fetch(url);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync("input.ogg", buffer);

    const tr = await openai.audio.transcriptions.create({
      file: fs.createReadStream("input.ogg"),
      model: "whisper-1"
    });

    const userText = tr.text?.trim() || "(voce non chiara)";
    const e = await getEssenceProfile();
    const tone = e.mood === "luminoso" ? "warm" : "neutral";

    let reply;
    if (irisMode === "book") {
      const r = await ragSearch(userText);
      reply = r.text;
    } else if (irisMode === "hybrid") {
      const r = await hybridSearch(userText, conversationMemory);
      reply = r.text;
      await saveConversationToQdrant(userText, reply);
    } else {
      addToMemory("user", userText);
      reply = await gptFreeResponse(userText, conversationMemory);
      addToMemory("assistant", reply);
      await saveConversationToQdrant(userText, reply);
    }

    if (e.mood === "luminoso") reply += "\n\nChe il Daje sia con Noi ⚗️";
    await bot.sendMessage(chatId, `🗣️ Hai detto: _${userText}_`, { parse_mode: "Markdown" });
    await bot.sendMessage(chatId, reply);
    await speakAndSend(chatId, reply, tone);

  } catch (err) {
    console.error("Errore (voice):", err);
    bot.sendMessage(chatId, "⚙️ Non sono riuscita a trascrivere il vocale.");
  }
});

// =======================================
// 🌐 Webhook + Health
// =======================================
app.get("/", (_req, res) => res.status(200).send(`IRIS 2.6.5e attiva – Mode: ${irisMode.toUpperCase()}`));

app.post(`/webhook/${TELEGRAM_TOKEN}`, (req, res) => {
  if (TG_SECRET_TOKEN && req.get("x-telegram-bot-api-secret-token") !== TG_SECRET_TOKEN)
    return res.sendStatus(401);
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

async function setupWebhook() {
  if (!PUBLIC_BASE_URL) return console.warn("⚠️ PUBLIC_BASE_URL non impostata.");
  const url = `${PUBLIC_BASE_URL}/webhook/${TELEGRAM_TOKEN}`;
  const params = TG_SECRET_TOKEN ? { secret_token: TG_SECRET_TOKEN } : undefined;
  try {
    await bot.setWebHook(url, params);
    console.log(`🔔 Webhook impostato: ${url}${TG_SECRET_TOKEN ? " (secret_token ON)" : ""}`);
  } catch (e) {
    console.error("Errore setWebHook:", e);
  }
}

(async () => {
  const arg = process.argv[2];
  if (arg === "--set-webhook") { await setupWebhook(); process.exit(0); }
  if (arg === "--delete-webhook") { await bot.deleteWebHook(); console.log("🗑️ Webhook cancellato."); process.exit(0); }
})();

app.listen(PORT, async () => {
  console.log(`🌍 Server Express attivo su porta ${PORT}`);
  await setupWebhook();
});
