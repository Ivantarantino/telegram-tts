// ===============================
// IRIS 2.6d - index.js
// HYBRID MODE di default + TTS (ogg) + STT (vocali Telegram)
// ===============================

import "./qdrantInit.js";
import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import textToSpeech from "@google-cloud/text-to-speech";
import http from "http";
import { fileURLToPath } from "url";
import { openai, ragSearch, gptFreeResponse, hybridSearch, saveConversationToQdrant } from "./ragSearch.js";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;

// === Gestione credenziali Google TTS (Render-friendly) ===
function ensureGoogleCreds() {
  const b64 = process.env.GOOGLE_TTS_CREDENTIALS_BASE64;
  if (b64) {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    const tmpPath = path.join(os.tmpdir(), "google-tts.json");
    fs.writeFileSync(tmpPath, json, { mode: 0o600 });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
    console.log("🔐 Google TTS credenziali caricate in /tmp");
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log("🔐 Google TTS via GOOGLE_APPLICATION_CREDENTIALS");
  } else {
    console.warn("⚠️ Nessuna credenziale Google TTS rilevata. Imposta GOOGLE_TTS_CREDENTIALS_BASE64 o GOOGLE_APPLICATION_CREDENTIALS.");
  }
}
ensureGoogleCreds();

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const ttsClient = new textToSpeech.TextToSpeechClient();

// === Modalità persistente su file ===
const MODE_FILE = "./iris_mode.txt";
function loadMode() {
  if (fs.existsSync(MODE_FILE)) return fs.readFileSync(MODE_FILE, "utf-8").trim();
  fs.writeFileSync(MODE_FILE, "hybrid"); // default
  return "hybrid";
}
function saveMode(m) { fs.writeFileSync(MODE_FILE, m); }
let irisMode = loadMode();
console.log(`🧭 Modalità iniziale: ${irisMode.toUpperCase()} MODE`);

// === Memoria conversazionale breve (11 interazioni) ===
const conversationMemory = [];
const MEMORY_LIMIT = 11;
function addToMemory(role, content) {
  conversationMemory.push({ role, content });
  if (conversationMemory.length > MEMORY_LIMIT * 2) {
    conversationMemory.splice(0, conversationMemory.length - MEMORY_LIMIT * 2);
  }
}

// === Utility TTS: filtra simboli poco pronunziabili ===
function sanitizeForTTS(text) {
  return text
    .replace(/⚡️|⚡/g, "")
    .replace(/[💥🔥✨💫⭐️🌟]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function speakAndSend(chatId, text) {
  const cleanText = sanitizeForTTS(text);
  const [audio] = await ttsClient.synthesizeSpeech({
    input: { text: cleanText },
    voice: { languageCode: "it-IT", ssmlGender: "FEMALE" },
    audioConfig: { audioEncoding: "OGG_OPUS", speakingRate: 1.0, pitch: 0.0 },
  });
  const ogg = "response.ogg";
  fs.writeFileSync(ogg, audio.audioContent, "binary");
  await bot.sendVoice(chatId, fs.createReadStream(ogg));
}

// === Comandi Telegram ===
bot.onText(/\/book/, (msg) => {
  irisMode = "book"; saveMode("book");
  bot.sendMessage(msg.chat.id, "📚 IRIS ora è in *BOOK MODE* – solo dai testi caricati.", { parse_mode: "Markdown" });
});

bot.onText(/\/free/, (msg) => {
  irisMode = "free"; saveMode("free");
  bot.sendMessage(msg.chat.id, "🌀 IRIS ora è in *FREE MODE* – GPT-4o-mini libero con memoria.", { parse_mode: "Markdown" });
});

bot.onText(/\/hy/, (msg) => {
  irisMode = "hybrid"; saveMode("hybrid");
  bot.sendMessage(msg.chat.id, "⚗️ IRIS ora è in *HYBRID MODE* – fonde testi e intelligenza libera.", { parse_mode: "Markdown" });
});

bot.onText(/\/mode/, (msg) => {
  const status = irisMode === "book" ? "📚 *BOOK MODE*" : irisMode === "hybrid" ? "⚗️ *HYBRID MODE*" : "🌀 *FREE MODE*";
  bot.sendMessage(msg.chat.id, `Modalità corrente: ${status}`, { parse_mode: "Markdown" });
});

// === Messaggi testuali ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text?.trim();

  // Evita doppio handling su comandi
  if (!userText || userText.startsWith("/")) return;

  try {
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

    await bot.sendMessage(chatId, reply);
    await speakAndSend(chatId, reply);
  } catch (err) {
    console.error("Errore (text):", err);
    await bot.sendMessage(chatId, "⚙️ Si è verificato un piccolo errore. Riprova tra poco.");
  }
});

// === Messaggi vocali (STT Whisper) ===
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  try {
    // 1) Recupera link file .ogg di Telegram
    const fileId = msg.voice.file_id;
    const file = await bot.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;

    // 2) Scarica audio in RAM
    const res = await fetch(url);
    const oggBuffer = Buffer.from(await res.arrayBuffer());

    // 3) Trascrizione con Whisper
    // openai.audio.transcriptions.create richiede File-like
    const fileObj = new File([oggBuffer], "audio.ogg", { type: "audio/ogg" });
    const tr = await openai.audio.transcriptions.create({
      file: fileObj,
      model: "whisper-1",
      // language: "it", // opzionale
    });

    const userText = tr.text?.trim() || "(voce non chiara)";
    // 4) Riusa la pipeline testuale
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

    await bot.sendMessage(chatId, `🗣️ Hai detto: _${userText}_`, { parse_mode: "Markdown" });
    await bot.sendMessage(chatId, reply);
    await speakAndSend(chatId, reply);
  } catch (err) {
    console.error("Errore (voice):", err);
    await bot.sendMessage(chatId, "⚙️ Non sono riuscita a trascrivere il vocale. Riprova con audio più vicino al microfono.");
  }
});

// === Server HTTP (keep-alive) ===
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`IRIS 2.6d attiva – Modalità: ${irisMode.toUpperCase()} MODE`);
}).listen(PORT, () => console.log(`🌍 Server attivo su porta ${PORT}`));
