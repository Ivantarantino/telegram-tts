// ===============================
// IRIS 2.8 - index.js
// Default: HYBRID MODE ⚗️
// Autoapprendimento Qdrant + /state /forget /export
// ===============================

import "./qdrantInit.js";
import fs from "fs";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import textToSpeech from "@google-cloud/text-to-speech";
import http from "http";
import {
  ragSearch,
  gptFreeResponse,
  hybridSearch,
  saveConversationToQdrant,
  getMemoryStats,
  clearChatHistory,
  exportChatHistory,
} from "./ragSearch.js";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const ttsClient = new textToSpeech.TextToSpeechClient();

// ===============================
// 🧭 Modalità operativa
// ===============================
const MODE_FILE = "./iris_mode.txt";

function loadMode() {
  if (fs.existsSync(MODE_FILE)) {
    return fs.readFileSync(MODE_FILE, "utf-8").trim();
  }
  fs.writeFileSync(MODE_FILE, "hybrid");
  return "hybrid";
}

function saveMode(mode) {
  fs.writeFileSync(MODE_FILE, mode);
}

let irisMode = loadMode();
console.log(`🧭 Modalità iniziale: ${irisMode.toUpperCase()} MODE`);

// ===============================
// 🧠 Memoria temporanea (RAM)
// ===============================
const conversationMemory = [];
const MEMORY_LIMIT = 11;

function addToMemory(role, content) {
  conversationMemory.push({ role, content });
  if (conversationMemory.length > MEMORY_LIMIT * 2) {
    conversationMemory.splice(0, conversationMemory.length - MEMORY_LIMIT * 2);
  }
}

function memorySize() {
  return Math.floor(conversationMemory.length / 2);
}

// ===============================
// 📡 Comandi Telegram
// ===============================
bot.onText(/\/book/, (msg) => {
  irisMode = "book";
  saveMode("book");
  bot.sendMessage(
    msg.chat.id,
    "📚 IRIS ora è in *BOOK MODE* – risponde solo in base ai testi caricati.",
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/free/, (msg) => {
  irisMode = "free";
  saveMode("free");
  bot.sendMessage(
    msg.chat.id,
    "🌀 IRIS ora è in *FREE MODE* – risponde liberamente con GPT-4o-mini (memoria breve + Qdrant).",
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/hy/, (msg) => {
  irisMode = "hybrid";
  saveMode("hybrid");
  bot.sendMessage(
    msg.chat.id,
    "⚗️ IRIS ora è in *HYBRID MODE* – fonde conoscenza dei libri e intelligenza libera (auto-apprendimento).",
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/mode/, (msg) => {
  const status =
    irisMode === "book"
      ? "📚 *BOOK MODE*"
      : irisMode === "hybrid"
      ? "⚗️ *HYBRID MODE*"
      : "🌀 *FREE MODE*";
  bot.sendMessage(msg.chat.id, `Modalità corrente: ${status}`, {
    parse_mode: "Markdown",
  });
});

bot.onText(/\/state/, async (msg) => {
  try {
    const stats = await getMemoryStats();
    const ram = memorySize();
    const text =
      "🧠 *Stato Memoria*\n" +
      `• Modalità: ${irisMode === "book" ? "📚 BOOK" : irisMode === "hybrid" ? "⚗️ HYBRID" : "🌀 FREE"}\n` +
      `• Memoria breve (RAM): ${ram} interazioni\n` +
      `• Qdrant libri (iris_memory): ~${stats.books} punti\n` +
      `• Qdrant chat (iris_chat_history): ~${stats.chat} punti\n`;
    await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
  } catch (e) {
    await bot.sendMessage(msg.chat.id, "⚙️ Impossibile recuperare lo stato memoria al momento.");
  }
});

bot.onText(/\/forget/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "⚠️ Confermi di voler cancellare *tutta* la memoria conversazionale? Rispondi con 'SI' per procedere.");
  bot.once("message", async (reply) => {
    if (reply.text.toLowerCase() === "si") {
      await clearChatHistory();
      conversationMemory.length = 0;
      await bot.sendMessage(chatId, "🧹 Memoria cancellata con successo!");
    } else {
      await bot.sendMessage(chatId, "❌ Operazione annullata.");
    }
  });
});

bot.onText(/\/export/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "📦 Esportazione memoria in corso...");
  try {
    const filePath = await exportChatHistory();
    await bot.sendDocument(chatId, filePath);
    fs.unlinkSync(filePath);
  } catch (e) {
    await bot.sendMessage(chatId, "⚙️ Errore durante l’esportazione della memoria.");
  }
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
      addToMemory("user", userMessage);
      addToMemory("assistant", textResponse);
      await saveConversationToQdrant(userMessage, textResponse, { mode: "hybrid" });
    } else {
      addToMemory("user", userMessage);
      textResponse = await gptFreeResponse(userMessage, conversationMemory);
      addToMemory("assistant", textResponse);
      await saveConversationToQdrant(userMessage, textResponse, { mode: "free" });
    }

    await bot.sendMessage(chatId, textResponse);
    const cleanText = textResponse.replace(/⚡️/g, "");
    const [ttsResponse] = await ttsClient.synthesizeSpeech({
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
    res.end(`IRIS 2.8 attiva – Modalità: ${irisMode.toUpperCase()} MODE`);
  })
  .listen(PORT, () => {
    console.log(`🌍 Server attivo su porta ${PORT}`);
  });
