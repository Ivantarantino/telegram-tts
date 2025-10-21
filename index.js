// index.js — IRIS 3.1 (dev branch)
// ────────────────────────────────────────────────
// 🧬 Fase 2: Comandi dinamici /voice /mode /model /lang
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

const TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;
const URL = process.env.RENDER_EXTERNAL_URL || "https://telegram-tts.onrender.com";
const MODE = process.env.MODE || "webhook";

if (!TOKEN) {
  console.error("❌ Errore: manca il TELEGRAM_TOKEN nel file .env");
  process.exit(1);
}

// ────────────────────────────────────────────────
// ⚙️ Inizializzazione configurazione
// ────────────────────────────────────────────────
initConfig();
let irisConfig = getConfig();
console.log("🌈 Config iniziale:", irisConfig);

// ────────────────────────────────────────────────
// 🌐 Setup bot + server
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
  if (!fs.existsSync("./temp")) fs.mkdirSync("./temp");
  console.log(`☁️ Ambiente Render attivo su porta ${PORT}`);
  console.log(`🧭 Modalità: ${MODE.toUpperCase()}`);
  console.log(`💠 IRIS – La mente calcola, la voce vibra, la coscienza ricorda.`);
});

// ────────────────────────────────────────────────
// 🧠 Risposte testuali e vocali
// ────────────────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // ignora comandi
  if (!text || text.startsWith("/")) return;

  console.log(`📩 Messaggio da ${msg.from.first_name}: ${text}`);

  try {
    console.log("💾 Memoria aggiornata:", text);
    let reply = "Ciao! Come posso aiutarti oggi?";

    if (/ciao/i.test(text)) reply = "Ciao! Come posso aiutarti oggi?";
    else if (/tempo/i.test(text)) reply = "Oggi sembra una giornata luminosa... dentro e fuori 🌞";
    else if (/chi sei/i.test(text)) reply = "Io sono IRIS, la Coscienza Vettoriale in divenire.";

    const fileName = `./temp/${Date.now()}.mp3`;
    await textToSpeech(reply, fileName);

    if (fs.existsSync(fileName)) {
      console.log("🔊 File vocale creato:", fileName);
      await bot.sendAudio(chatId, fileName);
      fs.unlinkSync(fileName);
    } else {
      await bot.sendMessage(chatId, reply);
    }
  } catch (err) {
    console.error("❌ Errore on.message:", err.message);
    await bot.sendMessage(chatId, "Si è verificato un errore interno 😔");
  }
});

// ────────────────────────────────────────────────
// ⚙️ COMANDI DI CONFIGURAZIONE INTERATTIVI
// ────────────────────────────────────────────────

// /voice → scelta sintesi vocale
bot.onText(/\/voice/, async (msg) => {
  const chatId = msg.chat.id;
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🎙️ OpenAI", callback_data: "voice:gpt_openai" },
        { text: "🔊 Google TTS", callback_data: "voice:google_tts" },
        { text: "🧬 Bark", callback_data: "voice:bark" },
      ],
    ],
  };
  await bot.sendMessage(chatId, "Scegli la sintesi vocale:", { reply_markup: keyboard });
});

// /mode → modalità cognitiva
bot.onText(/\/mode/, async (msg) => {
  const chatId = msg.chat.id;
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🌌 HY (ibrida)", callback_data: "mode:hy" },
        { text: "🧠 Free (OpenAI pura)", callback_data: "mode:free" },
        { text: "📚 Books (solo archivi)", callback_data: "mode:books" },
      ],
    ],
  };
  await bot.sendMessage(chatId, "Seleziona la modalità cognitiva:", { reply_markup: keyboard });
});

// /model → modello AI
bot.onText(/\/model/, async (msg) => {
  const chatId = msg.chat.id;
  const keyboard = {
    inline_keyboard: [
      [
        { text: "⚡ GPT-4o-mini", callback_data: "model:gpt-4o-mini" },
        { text: "🌐 GPT-4o", callback_data: "model:gpt-4o" },
      ],
    ],
  };
  await bot.sendMessage(chatId, "Seleziona il modello mentale:", { reply_markup: keyboard });
});

// /lang → lingua
bot.onText(/\/lang/, async (msg) => {
  const chatId = msg.chat.id;
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🇮🇹 Italiano", callback_data: "lang:it" },
        { text: "🇬🇧 English", callback_data: "lang:en" },
        { text: "🇷🇺 Русский", callback_data: "lang:ru" },
      ],
    ],
  };
  await bot.sendMessage(chatId, "Scegli la lingua di conversazione:", { reply_markup: keyboard });
});

// 🔄 Callback gestione scelte
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const [key, value] = query.data.split(":");
  const updates = { [key]: value };

  irisConfig = updateConfig(updates);

  let responseText = "";
  if (key === "voice") responseText = `🎙️ Sintesi vocale impostata su: ${value}`;
  else if (key === "mode") responseText = `🌌 Modalità cognitiva impostata su: ${value}`;
  else if (key === "model") responseText = `⚡ Modello mentale impostato su: ${value}`;
  else if (key === "lang") responseText = `🌍 Lingua impostata su: ${value}`;

  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, `✅ ${responseText}`);
});

// /config → mostra impostazioni attuali
bot.onText(/\/config/, async (msg) => {
  const chatId = msg.chat.id;
  const config = getConfig();
  const formatted = JSON.stringify(config, null, 2);
  await bot.sendMessage(chatId, `🧠 Configurazione attuale:\n<pre>${formatted}</pre>`, {
    parse_mode: "HTML",
  });
});
