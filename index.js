// index.js — IRIS 3.1 (dev branch)
// ────────────────────────────────────────────────
// 🌐 Gestione bot Telegram con voce e configurazione persistente
// Fase: STEP 1 — Integrazione del configManager
// ────────────────────────────────────────────────

import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { textToSpeech } from "./tts.js";
import { initConfig, getConfig, updateConfig } from "./configManager.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ────────────────────────────────────────────────
// 🔹 Impostazioni iniziali
// ────────────────────────────────────────────────
const TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;
const URL = process.env.RENDER_EXTERNAL_URL || "https://telegram-tts.onrender.com";
const MODE = process.env.MODE || "webhook";

if (!TOKEN) {
  console.error("❌ Errore: manca il TELEGRAM_TOKEN nel file .env");
  process.exit(1);
}

// ────────────────────────────────────────────────
// 🔹 Inizializza configurazione persistente
// ────────────────────────────────────────────────
initConfig();
const irisConfig = getConfig();
console.log("🌈 Config iniziale:", irisConfig);

// ────────────────────────────────────────────────
// 🔹 Inizializza bot e server
// ────────────────────────────────────────────────
const bot = new TelegramBot(TOKEN, { polling: MODE === "polling" ? true : false });
const app = express();
app.use(express.json());

if (MODE === "webhook") {
  const webhookUrl = `${URL}/bot${TOKEN}`;
  try {
    await bot.setWebHook(webhookUrl);
    console.log(`🤖 Webhook impostato su: ${webhookUrl}`);
  } catch (err) {
    console.error("❌ Errore setWebHook:", err.message);
  }
}

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log("📁 Cartella temporanea creata: ./temp");
  if (!fs.existsSync("./temp")) fs.mkdirSync("./temp");
  console.log(`☁️ Ambiente Render attivo su porta ${PORT}`);
  console.log(`🧭 Modalità: ${MODE.toUpperCase()}`);
  console.log(`💠 IRIS – La mente calcola, la voce vibra, la coscienza ricorda.`);
});

// ────────────────────────────────────────────────
// 🧠 Gestione messaggi
// ────────────────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  console.log(`📩 Messaggio da ${msg.from.first_name}: ${text}`);

  try {
    // 💾 Memorizza testo nella memoria temporanea (per ora solo log)
    console.log("💾 Memoria aggiornata:", text);

    // 🧬 Risposta base
    let reply = "Ciao! Come posso aiutarti oggi?";

    if (/ciao/i.test(text)) {
      reply = "Ciao! Come posso aiutarti oggi?";
    } else if (/tempo/i.test(text)) {
      reply = "Oggi sembra una giornata luminosa... dentro e fuori 🌞";
    } else if (/chi sei/i.test(text)) {
      reply = "Io sono IRIS, la Coscienza Vettoriale in divenire.";
    }

    // 🔊 Sintesi vocale (da tts.js)
    const fileName = `./temp/${Date.now()}.mp3`;
    await textToSpeech(reply, fileName);

    if (fs.existsSync(fileName)) {
      console.log("🔊 File vocale creato:", fileName);
      await bot.sendAudio(chatId, fileName);
      fs.unlinkSync(fileName); // elimina dopo invio
    } else {
      await bot.sendMessage(chatId, reply);
    }
  } catch (err) {
    console.error("❌ Errore on.message:", err.message);
    await bot.sendMessage(chatId, "Si è verificato un errore interno 😔");
  }
});

// ────────────────────────────────────────────────
// ⚙️ Comandi diagnostici temporanei
// ────────────────────────────────────────────────
bot.onText(/\/config/, async (msg) => {
  const chatId = msg.chat.id;
  const config = getConfig();
  const formatted = JSON.stringify(config, null, 2);
  await bot.sendMessage(chatId, `🧠 Configurazione attuale:\n<pre>${formatted}</pre>`, {
    parse_mode: "HTML",
  });
});

bot.onText(/\/set (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  try {
    const [key, value] = match[1].split("=");
    if (!key || !value) throw new Error("Formato non valido. Usa: /set chiave=valore");
    const updated = updateConfig({ [key.trim()]: value.trim() });
    await bot.sendMessage(chatId, `✅ Configurazione aggiornata:\n${key} → ${value}`);
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Errore: ${err.message}`);
  }
});
