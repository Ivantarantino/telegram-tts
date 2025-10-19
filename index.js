// ===============================
// IRIS 2.6 - index.js
// Modalità: FREE / BOOK / HYBRID
// Memoria: breve (11 msg) + persistente su Qdrant
// ===============================

import fs from "fs";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import textToSpeech from "@google-cloud/text-to-speech";
import { ragSearch, gptFreeResponse, hybridSearch, saveConversationToQdrant } from "./ragSearch.js";
import http from "http";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const client = new textToSpeech.TextToSpeechClient();

// ===============================
// 🧭 Modalità operativa (persistente su file)
// ===============================
const MODE_FILE = "./iris_mode.txt";

function loadMode() {
  if (fs.existsSync(MODE_FILE)) {
    return fs.readFileSync(MODE_FILE, "utf-8").trim();
  }
  fs.writeFileSync(MODE_FILE, "free");
  return "free";
}

function saveMode(mode) {
  fs.writeFileSync(MODE_FILE, mode);
}

let irisMode = loadMode();
console.log(`🧭 Modalità iniziale: ${irisMode.toUpperCase()} MODE`);

// ===============================
// 🧠 Memoria conversazionale temporanea
// ===============================
const conversationMemory = [];
const MEMORY_LIMIT = 11;

function addToMemory(role, content) {
  conversationMemory.push({ role, content });
  if (conversationMemory.length > MEMORY_LIMIT * 2) {
    conversationMemory.splice(0, conversationMemory.length - MEMORY_LIMIT * 2);
  }
}

// ===============================
// 📡 Comandi Telegram
// ===============================
bot.onText(/\/book/, (msg) => {
  irisMode = "book";
  saveMode("book");
  bot.sendMessage(msg.chat.id, "📚 IRIS ora è in *BOOK MODE* – risponde basandosi solo sui testi caricati.", { parse_mode: "Markdown" });
});

bot.onText(/\/free/, (msg) => {
  irisMode = "free";
  saveMode("free");
  bot.sendMessage(msg.chat.id, "🌀 IRIS ora è in *FREE MODE* – risponde liberamente con GPT-4o-mini.", { parse_mode: "Markdown" });
});

bot.onText(/\/hy/, (msg) => {
  irisMode = "hybrid";
  saveMode("hybrid");
  bot.sendMessage(msg.chat.id, "⚗️ IRIS ora è in *HYBRID MODE* – unisce conoscenza dei libri e intelligenza libera.", { parse_mode: "Markdown" });
});

bot.onText(/\/mode/, (msg) => {
  const status =
    irisMode === "book"
      ? "📚 *BOOK MODE*"
      : irisMode === "hybrid"
      ? "⚗️ *HYBRID MODE*"
      : "🌀 *FREE MODE*";
  bot.sendMessage(msg.chat.id, `Modalità corrente: ${status}`, { parse_mode: "Markdown" });
});

// ===============================
// 💬 Gestione messaggi
// ===============================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text?.trim();

  if (!userMessage || userMessage.startsWith("/")) return;

  console.log(`[USER @${msg.from.username || "anon"}] (${irisMode} mode): ${userMessage}`);

  try {
    let textResponse;

    if (irisMode === "book") {
      const response = await ragSearch(userMessage);
      textResponse = response.text;
    } else if (irisMode === "hybrid") {
      const response = await hybridSearch(userMessage, conversationMemory);
      textResponse = response.text;
    } else {
      addToMemory("user", userMessage);
      textResponse = await gptFreeResponse(userMessage, conversationMemory);
      addToMemory("assistant", textResponse);
      await saveConversationToQdrant(userMessage, textResponse);
    }

    await bot.sendMessage(chatId, textResponse);

    const cleanText = textResponse.replace(/⚡️/g, "");
    const [ttsResponse] = await client.synthesizeSpeech({
      input: { text: cleanText },
      voice: { languageCode: "it-IT", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "OGG_OPUS" },
    });

    fs.writeFileSync("response.ogg", ttsResponse.audioContent, "binary");
    await bot.sendVoice(chatId, fs.createReadStream("response.ogg"));

    console.log(`[IRIS 🔊]: risposta vocale inviata (${irisMode} mode)`);
  } catch (error) {
    console.error("Errore nel messaggio:", error);
    await bot.sendMessage(chatId, "⚙️ Si è verificato un piccolo errore. Riprova tra poco.");
  }
});

// ===============================
// 🌐 Server HTTP (anti-sleep Render)
// ===============================
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`IRIS 2.6 attiva – Modalità attuale: ${irisMode.toUpperCase()} MODE`);
  })
  .listen(PORT, () => {
    console.log(`🌍 Server attivo su porta ${PORT}`);
  });
