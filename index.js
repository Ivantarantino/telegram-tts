// ===============================
// IRIS 2.4 - index.js
// Default: FREE MODE 🌀
// Memoria conversazionale: ultime 11 interazioni (solo free mode)
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
  // ✅ Default: FREE MODE
  fs.writeFileSync(MODE_FILE, "free");
  return "free";
}

function saveMode(mode) {
  fs.writeFileSync(MODE_FILE, mode);
}

let irisMode = loadMode();
console.log(`🧭 Modalità iniziale: ${irisMode.toUpperCase()} MODE`);

// ===============================
// 🧠 Memoria conversazionale (solo Free Mode)
// ===============================
const conversationMemory = [];
const MEMORY_LIMIT = 11;

function addToMemory(role, content) {
  conversationMemory.push({ role, content });
  if (conversationMemory.length > MEMORY_LIMIT * 2) {
    // Ogni interazione ha user + assistant → moltiplica per 2
    conversationMemory.splice(0, conversationMemory.length - MEMORY_LIMIT * 2);
  }
}

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
  bot.sendMessage(msg.chat.id, "🌀 IRIS ora è in *FREE MODE* – risponde liberamente con GPT-4o-mini, mantenendo memoria delle ultime 11 interazioni.", { parse_mode: "Markdown" });
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
      // Aggiunge il messaggio utente alla memoria
      addToMemory("user", userMessage);
      textResponse = await gptFreeResponse(userMessage, conversationMemory);
      // Aggiunge la risposta di IRIS alla memoria
      addToMemory("assistant", textResponse);
    }

    // === Invio messaggio testuale ===
    await bot.sendMessage(chatId, textResponse);

    // === Pulizia simboli per TTS ===
    const cleanText = textResponse.replace(/⚡️/g, "");

    // === Sintesi vocale con Google TTS (OGG_OPUS) ===
    const [ttsResponse] = await client.synthesizeSpeech({
      input: { text: cleanText },
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
    res.end("IRIS 2.4 attiva - Free Mode con memoria (11 interazioni) 🌀");
  })
  .listen(PORT, () => {
    console.log(`🌍 Server attivo su porta ${PORT}`);
  });
