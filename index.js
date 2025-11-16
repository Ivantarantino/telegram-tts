// index.js — IRIS 5.0.9.1 (Fix Deploy + RAG + TTS) – 17 novembre 2025
// ========================================================
// Avvio server Express + Telegram bot + RAG + TTS
// ========================================================

import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { irisHeartSpeak } from "./core/iris_heart_voice.js";
import { ragAnswerFromQuery } from "./core/iris_rag_core.js";
import { getStateSummary, setLang, setVoice, setModel, getMode, getVoice } from "./core/iris_state.js";
import { synthToFile } from "./adapters/tts.js";  // Import named corretto

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN mancante.");
  process.exit(1);
}

const TEMP_DIR = path.join(__dirname, "temp");
fs.mkdirSync(TEMP_DIR, { recursive: true });

const USE_WEBHOOK = !!PUBLIC_BASE_URL;
const bot = new TelegramBot(BOT_TOKEN, { polling: !USE_WEBHOOK });

const app = express();
app.use(bodyParser.json());

if (USE_WEBHOOK) {
  const WEBHOOK_PATH = `/bot${BOT_TOKEN}`;
  app.post(WEBHOOK_PATH, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
  bot.setWebHook(`${PUBLIC_BASE_URL}${WEBHOOK_PATH}`).then(() => {
    console.log(`🔗 Webhook attivo: ${PUBLIC_BASE_URL}${WEBHOOK_PATH}`);
  }).catch(err => console.error("❌ Errore webhook:", err));
}

// Healthcheck
app.get("/", (req, res) => res.send("IRIS online."));

app.listen(PORT, () => console.log(`🚀 Server su porta ${PORT}`));

// =====================================================
// Handlers Telegram
// =====================================================

// Comandi di configurazione
bot.onText(/\/lang (.+)/, (msg, match) => {
  const lang = match[1].trim().toLowerCase();
  setLang(lang);
  bot.sendMessage(msg.chat.id, `Lingua impostata su ${lang.toUpperCase()}.`);
});

bot.onText(/\/voice (.+)/, (msg, match) => {
  const voice = match[1].trim();
  setVoice(voice);
  bot.sendMessage(msg.chat.id, `Voce impostata su ${voice}.`);
});

bot.onText(/\/model (.+)/, (msg, match) => {
  const model = match[1].trim();
  setModel(model);
  bot.sendMessage(msg.chat.id, `Modello impostato su ${model}.`);
});

bot.onText(/\/state/, (msg) => {
  bot.sendMessage(msg.chat.id, getStateSummary(), { parse_mode: "Markdown" });
});

// Handler messaggi di testo – RAG integrato
bot.on("text", async (msg) => {
  if (msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;
  const senderName = msg.from.first_name || "";
  const query = msg.text.trim();

  try {
    const mode = getMode();
    const ragContext = await ragAnswerFromQuery(query, mode);

    const replyText = await irisHeartSpeak(query, {
      senderName,
      ragContext,
      mode,
    });

    await bot.sendMessage(chatId, replyText);

    // TTS con voce dallo state
    const voice = getVoice();  // Assumo getVoice in iris_state.js
    const audioPath = path.join(TEMP_DIR, `voice_${Date.now()}.mp3`);
    await synthToFile(replyText, audioPath, voice);
    await bot.sendVoice(chatId, fs.createReadStream(audioPath));
    fs.unlinkSync(audioPath);
  } catch (err) {
    console.error("❌ Errore handler text:", err);
    bot.sendMessage(chatId, "Per un attimo ho perso il filo… riprova.");
  }
});

// Polling se non webhook
if (!USE_WEBHOOK) {
  console.log("📡 Polling Telegram attivo.");
}
