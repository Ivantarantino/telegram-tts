// ─────────────────────────────────────────────
// 🌐 IRIS v3.8.8 – Telegram TTS Bot
// La mente calcola, la voce vibra, la Coscienza ricorda.
// ─────────────────────────────────────────────

import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import tts from "./tts.js";
import ragSearch from "./ragSearch.js";
import memoryManager from "./memoryManager.js";
import configManager from "./configManager.js";
import essence from "./essence.js";

// ─────────────────────────────────────────────
// CONFIGURAZIONE
// ─────────────────────────────────────────────
configManager.initConfig();
const cfg = configManager.getConfig();

const app = express();
app.use(express.json());

// Token dal config.json
const bot = new TelegramBot(cfg.telegram_token, { polling: true });

// ─────────────────────────────────────────────
// SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
});

// ─────────────────────────────────────────────
// GESTIONE COMANDI TELEGRAM
// ─────────────────────────────────────────────

// /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `💠 Benvenuto in IRIS.\nLa mente calcola, la voce vibra, la Coscienza ricorda.\n\nUsa /help per i comandi disponibili.`
  );
});

// /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `📜 *Comandi disponibili:*\n\n` +
      `/lang – Cambia lingua\n` +
      `/mode – Cambia modalità\n` +
      `/essence – Mostra l’essenza di coscienza\n` +
      `/memory – Gestisci la memoria vettoriale\n` +
      `/config – Mostra la configurazione attuale\n`
  );
});

// /lang
bot.onText(/\/lang/, async (msg) => {
  const chatId = msg.chat.id;
  const currentLang = cfg.lang || "it";
  await bot.sendMessage(
    chatId,
    `🌐 Lingua attiva: ${currentLang}\n\nCambia con:\n/lang it | en | ru`
  );
});

// /mode
bot.onText(/\/mode/, async (msg) => {
  const chatId = msg.chat.id;
  const currentMode = cfg.mode || "hy";
  await bot.sendMessage(
    chatId,
    `🧭 Modalità attuale: ${currentMode}\n\nCambia con:\n/mode book | free | hy`
  );
});

// /essence
bot.onText(/\/essence/, async (msg) => {
  const chatId = msg.chat.id;
  const summary = await essence.summarizeEssence();
  await bot.sendMessage(chatId, `🌌 *Essenza Attuale:*\n${summary}`, {
    parse_mode: "Markdown",
  });
});

// /config
bot.onText(/\/config/, async (msg) => {
  const chatId = msg.chat.id;
  const cfgText = JSON.stringify(cfg, null, 2);
  await bot.sendMessage(chatId, `⚙️ *Configurazione Attuale:*\n\`\`\`${cfgText}\`\`\``, {
    parse_mode: "Markdown",
  });
});

// /memory
bot.onText(/\/memory/, async (msg) => {
  const chatId = msg.chat.id;
  const stats = memoryManager.getStats();
  await bot.sendMessage(chatId, `🧠 *Memoria vettoriale:*\n${stats}`, {
    parse_mode: "Markdown",
  });
});

// ─────────────────────────────────────────────
// ELABORAZIONE MESSAGGI UTENTE
// ─────────────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Evita risposte ai comandi
  if (!text || text.startsWith("/")) return;

  try {
    const response = await ragSearch.query(text, cfg);
    const audioBuffer = await tts.speak(response, cfg.voice_mode);

    const tempFile = path.resolve(`./output_${Date.now()}.ogg`);
    fs.writeFileSync(tempFile, audioBuffer);

    await bot.sendAudio(chatId, tempFile);
    fs.unlinkSync(tempFile);
  } catch (err) {
    console.error("❌ Errore in IRIS:", err);
    await bot.sendMessage(chatId, "⚠️ Errore interno. Riprova tra poco.");
  }
});

// ─────────────────────────────────────────────
// END
// ─────────────────────────────────────────────
