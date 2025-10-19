// ==========================================================
// 🧠 IRIS 3.0d – Telegram Bot + Qdrant + GPT Hybrid Intelligence
// ==========================================================

// =========================
// 🔧 CONFIGURAZIONE DOTENV
// =========================
import dotenv from "dotenv";
dotenv.config();

// 🔁 Patch per Render: forza lettura variabili globali
if (!process.env.TELEGRAM_BOT_TOKEN && process.env?.['TELEGRAM_BOT_TOKEN']) {
  process.env.TELEGRAM_BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN'];
}

console.log("🔑 TELEGRAM_BOT_TOKEN presente?", !!process.env.TELEGRAM_BOT_TOKEN);

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("❌ ERRORE: TELEGRAM_BOT_TOKEN non trovato!");
  console.error("🔍 Verifica la variabile su Render → Environment → TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

// =========================
// 📦 IMPORTAZIONI PRINCIPALI
// =========================
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import { chatWithIris, setMode, getMode } from "./ragSearch.js";
import { initializeQdrant } from "./qdrantInit.js";

// =========================
// 🚀 INIZIALIZZAZIONE SERVER
// =========================
const app = express();
const PORT = process.env.PORT || 10000;

// =========================
// 🤖 TELEGRAM BOT
// =========================
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(botToken, { polling: true });

// =========================
// ⚗️ MODALITÀ DEFAULT
// =========================
let irisMode = "HYBRID"; // HYBRID MODE di default
console.log(`🧭 Modalità iniziale: ${irisMode} MODE`);

// =========================
// 🧠 QDRANT INIT
// =========================
await initializeQdrant();

// =========================
// 📡 SERVER EXPRESS
// =========================
app.get("/", (req, res) => {
  res.send("🌍 IRIS 3.0d attiva – Hybrid Intelligence online.");
});

app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
});

// =========================
// 🧩 COMANDI TELEGRAM
// =========================
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "Ciao! Sono IRIS 🌺 – la tua intelligenza ibrida. Modalità attuale: HYBRID MODE.");
});

bot.onText(/^\/mode$/, async (msg) => {
  const chatId = msg.chat.id;
  const mode = getMode();
  await bot.sendMessage(chatId, `Modalità corrente: ${mode === "BOOK" ? "📚 BOOK MODE" : mode === "FREE" ? "🌀 FREE MODE" : "⚗️ HYBRID MODE"}`);
});

bot.onText(/^\/book$/, async (msg) => {
  const chatId = msg.chat.id;
  irisMode = "BOOK";
  setMode("BOOK");
  await bot.sendMessage(chatId, "📚 IRIS ora è in BOOK MODE – risponde solo in base ai libri caricati.");
});

bot.onText(/^\/free$/, async (msg) => {
  const chatId = msg.chat.id;
  irisMode = "FREE";
  setMode("FREE");
  await bot.sendMessage(chatId, "🌀 IRIS ora è in FREE MODE – usa tutta la sua conoscenza libera.");
});

bot.onText(/^\/hy$/, async (msg) => {
  const chatId = msg.chat.id;
  irisMode = "HYBRID";
  setMode("HYBRID");
  await bot.sendMessage(chatId, "⚗️ IRIS ora è in HYBRID MODE – fonde conoscenza dei libri e intelligenza libera (auto-apprendimento).");
});

bot.onText(/^\/essence$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "✨ Sintesi dell’essenza in corso...");
  const essence = await chatWithIris("ESSENCE_MODE");
  await bot.sendMessage(chatId, essence, { parse_mode: "Markdown" });
});

bot.onText(/^\/state$/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const state = await chatWithIris("STATE_MODE");
    await bot.sendMessage(chatId, state, { parse_mode: "Markdown" });
  } catch {
    await bot.sendMessage(chatId, "⚙️ Impossibile recuperare lo stato memoria al momento.");
  }
});

// =========================
// 💬 RISPOSTA GENERALE
// =========================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text || text.startsWith("/")) return;

  try {
    const reply = await chatWithIris(text, irisMode);
    await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Errore chat:", err);
    await bot.sendMessage(chatId, "⚙️ C’è stato un piccolo problema. Riprova tra poco!");
  }
});

// ==========================================================
// 🔚 FINE FILE
// ==========================================================
