// ===============================
// IRIS 2.1 - index.js
// Modalità: book mode / free mode
// Telegram Bot + Google TTS + GPT-4o-mini + Qdrant
// ===============================

import fs from "fs";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import textToSpeech from "@google-cloud/text-to-speech";
import { ragSearch, gptFreeResponse } from "./ragSearch.js";
import http from "http";

dotenv.config();

// ===============================
// 🔐 Variabili ambiente
// ===============================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;

// ===============================
// 🤖 Inizializzazione Bot Telegram
// ===============================
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ===============================
// 🎙️ Inizializzazione Google TTS
// ===============================
const client = new textToSpeech.TextToSpeechClient();

// ===============================
// 🧭 Modalità operativa (persistente su file)
// ===============================
const MODE_FILE = "./iris_mode.txt";

function loadMode() {
  if (fs.existsSync(MODE_FILE)) {
    return fs.readFileSync(MODE_FILE, "utf-8").trim();
  }
  fs.writeFileSync(MODE_FILE, "book");
  return "book";
}

function saveMode(mode) {
  fs.writeFileSync(MODE_FILE, mode);
}

let irisMode = loadMode();
console.log(`🧭 Modalità iniziale: ${irisMode.toUpperCase()} MODE`);

// ===============================
// 📡 Gestione comandi Telegram
// ===============================
bot.onText(/\/book/, (msg) => {
  irisMode = "book";
  saveMode("book");
  bot.sendMessage(msg.chat.id, "📚 IRIS ora è in *BOOK MODE* – risponde basandosi sui testi caricati.", { parse_mode: "Markdown" });
});

bot.onText(/\/free/, (msg) => {
  irisMode = "free";
  saveMode("free");
  bot.sendMessage(msg.chat.id, "🌀 IRIS ora è in *FREE MODE* – risponde liberamente con GPT-4o-mini.", { parse_mode: "Markdown" });
});

bot.onText(/\/mode/, (msg) => {
  const status = irisMode === "book" ? "📚 *BOOK MODE*" : "🌀 *FREE MODE*";
  bot.sendMessage(msg.chat.id, `Modalità corrente: ${status}`, { parse_mode: "Markdown" });
});

// ===============================
// 💬 Gestione messaggi testuali
// ===============================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text?.trim();

  // Evita di riprocessare i comandi
  if (!userMessage || userMessage.startsWith("/")) return;

  console.log(`[USER @${msg.from.username || "anon"}] (${irisMode} mode): ${userMessage}`);

  try {
    let textResponse;

    if (irisMode === "book") {
      const response = await ragSearch(userMessage);
      textResponse = response.text;
    } else {
      textResponse = await gptFreeResponse(userMessage);
    }

    // === Invio messaggio testuale ===
    await bot.sendMessage(chatId, textResponse);

    // === Sintesi vocale con Google TTS (OGG_OPUS) ===
    const [ttsResponse] = await client.synthesizeSpeech({
      input: { text: textResponse },
      voice: { languageCode: "it-IT", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "OGG_OPUS" },
    });

    const oggFile = "response.ogg";
    fs.writeFileSync(oggFile, ttsResponse.audioContent, "binary");
    await bot.sendVoice(chatId, fs.createReadStream(oggFile));

    console.log(`[IRIS 🔊]: risposta vocale inviata (${irisMode} mode)`);
  } catch (error) {
    console.error("Errore nel messaggio:", error);
    await bot.sendMessage(chatId, "⚙️ Si è verificato un errore temporaneo. Riprova tra poco.");
  }
});

// ===============================
// 🌐 Server HTTP locale (Render ping)
// ===============================
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("IRIS 2.1 attiva ⚡️");
  })
  .listen(PORT, () => {
    console.log(`🌍 Server attivo su porta ${PORT}`);
  });
