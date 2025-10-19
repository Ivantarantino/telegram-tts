// ==========================================================
// ⚙️ IRIS 3.0e – compatibilità Render + fallback dotenv
// ==========================================================

import express from "express";
import TelegramBot from "node-telegram-bot-api";
import { chatWithIris, setMode, getMode } from "./ragSearch.js";
import { initializeQdrant } from "./qdrantInit.js";
import dotenv from "dotenv";

// ✅ Carica .env solo se in locale
if (!process.env.RENDER) {
  dotenv.config();
  console.log("📦 Modalità locale: variabili caricate da .env");
} else {
  console.log("🌐 Modalità Render: uso variabili d’ambiente");
}

// ==========================================================
// 🔑 Controllo chiavi essenziali
// ==========================================================
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;

console.log("🔍 Controllo variabili d’ambiente...");
console.log("• TELEGRAM_BOT_TOKEN:", BOT_TOKEN ? "✅" : "❌");
console.log("• OPENAI_API_KEY:", OPENAI_KEY ? "✅" : "❌");
console.log("• QDRANT_URL:", QDRANT_URL ? "✅" : "❌");

if (!BOT_TOKEN) {
  console.error("❌ ERRORE: TELEGRAM_BOT_TOKEN non trovato!");
  process.exit(1);
}

// ==========================================================
// 🤖 Avvio Telegram Bot
// ==========================================================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const app = express();
const PORT = process.env.PORT || 10000;

// ==========================================================
// 🧠 Inizializzazione Qdrant
// ==========================================================
await initializeQdrant();

// ==========================================================
// 💬 Gestione messaggi Telegram
// ==========================================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() || "";

  if (text.startsWith("/mode")) {
    const parts = text.split(" ");
    const newMode = parts[1];
    setMode(chatId, newMode);
    bot.sendMessage(chatId, `🔄 Modalità cambiata in: ${newMode}`);
    return;
  }

  const mode = getMode(chatId);
  const reply = await chatWithIris(text, mode, chatId);
  bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
});

// ==========================================================
// 🌍 Server Express (Render keep-alive)
// ==========================================================
app.get("/", (req, res) => {
  res.send("IRIS 3.0e – online ✨");
});

app.listen(PORT, () => {
  console.log(`🚀 IRIS attiva su porta ${PORT}`);
});
