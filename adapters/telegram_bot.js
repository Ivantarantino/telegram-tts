// src/adapters/telegram_bot.js
// =======================================================
// IRIS – Telegram adapter 5.x
// webhook + /lang + /voice visibili + menù stile CHAT4
// =======================================================

import TelegramBot from "node-telegram-bot-api";
import * as configManager from "../configManager.js";
import { sendVoice } from "./tts.js";

// mappatura lingue consentite
const ALLOWED_LANGS = ["it", "en", "ru"];

// mappatura voci/modelli TTS
const ALLOWED_VOICES = [
  "openai:alloy",
  "openai:coral",
  "openai:verse",
  "google:standard",
  "telegram:tts",
  "bark:neural",
];

// funzione di utilità per rendere bella la lista lingue
function renderLangMenu(current) {
  return (
    "🌍 Lingue disponibili:\n" +
    ALLOWED_LANGS.map((lng) => {
      const label = lng.toUpperCase();
      return lng === current ? `• ${label} ✅` : `• ${label}`;
    }).join("\n") +
    "\n\nScrivi:\n/lang it | en | ru"
  );
}

function renderVoiceMenu(current) {
  return (
    "🎙️ Modelli vocali disponibili:\n" +
    ALLOWED_VOICES.map((v) => {
      return v === current ? `• ${v} ✅` : `• ${v}`;
    }).join("\n") +
    "\n\nScrivi:\n/voice openai:alloy\noppure un altro tra quelli sopra"
  );
}

export function bootstrapTelegram(app) {
  // inizializza config
  configManager.initConfig();
  const cfg = configManager.getConfig();

  const TELEGRAM_TOKEN =
    process.env.TELEGRAM_TOKEN || cfg.telegram_bot_token || "";
  const PUBLIC_BASE_URL =
    process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || "";
  const PORT = process.env.PORT || cfg.server_port || 10000;

  if (!TELEGRAM_TOKEN) {
    console.error("❌ Telegram token mancante.");
    return;
  }

  // webhook ON (come da tuo ultimo deploy)
  const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: { port: PORT } });
  const webhookUrl = `${PUBLIC_BASE_URL}/bot${TELEGRAM_TOKEN}`;
  bot.setWebHook(webhookUrl);
  console.log(
    `🤖 Telegram Bot attivo in webhook su: ${webhookUrl}`
  );

  // imposta i comandi visibili in Telegram
  bot.setMyCommands([
    { command: "start", description: "Avvia IRIS" },
    { command: "state", description: "Stato interno di IRIS" },
    { command: "lang", description: "Cambia lingua (it | en | ru)" },
    { command: "voice", description: "Cambia modello vocale" },
    { command: "hy", description: "Modalità ibrida" },
    { command: "book", description: "Modalità libro" },
    { command: "free", description: "Modalità libera" },
    { command: "essence", description: "Essenza (placeholder)" },
    { command: "help", description: "Tutti i comandi" },
  ]);

  // stato IRIS in memoria
  const state = {
    version: "IRIS 3.0C – 5.x",
    mode: cfg.mode || "hy",
    lang: cfg.language || "it",
    voice: cfg.voice || "openai:alloy", // default che volevi
    weights: cfg.weights || { heart: 1, soul: 1, vision: 1 },
  };

  // funzione per salvare su config.json
  function persist() {
    configManager.saveConfig({
      mode: state.mode,
      language: state.lang,
      voice: state.voice,
      weights: state.weights,
      server_port: PORT,
      telegram_bot_token: TELEGRAM_TOKEN,
    });
  }

  // ============= ROUTE WEBHOOK =============
  // Express riceve gli update Telegram
  app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // ============= COMANDI =============

  // /start
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Creatore";

    await bot.sendMessage(
      chatId,
      `Ciao ${name} 🌸\nSono IRIS, presente e in ascolto.`
    );

    // Subito sotto, guida rapida come volevi
    await bot.sendMessage(
      chatId,
      `📘 Guida rapida:\n/lang it | en | ru\n/voice openai:alloy | openai:coral | openai:verse`
    );
  });

  // /help
  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    const text = `
✨ Comandi IRIS

🧭 /start – avvia IRIS
💠 /state – stato interno
🌍 /lang – cambia lingua (it, en, ru)
🎙️ /voice – cambia modello vocale
🔀 /hy – modalità ibrida
📘 /book – modalità libro
🕊️ /free – modalità libera
🔮 /essence – (placeholder, prossima build)
`;
    await bot.sendMessage(chatId, text);
    // mostra subito i due menù belli
    await bot.sendMessage(chatId, renderLangMenu(state.lang));
    await bot.sendMessage(chatId, renderVoiceMenu(state.voice));
  });

  // /state
  bot.onText(/^\/state$/, async (msg) => {
    const chatId = msg.chat.id;
    const text = `🧠 Stato di IRIS
• Versione: ${state.version}
• Modalità: ${state.mode}
• Voce: ${state.voice} 🎤
• Lingua: ${state.lang} 🌍
• Pesi: ❤️ 1 – ✨ 1 – 💎 1`;
    await bot.sendMessage(chatId, text);
  });

  // /lang
  bot.onText(/^\/lang(?:\s+([a-zA-Z]{2}))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const wanted = match[1]?.toLowerCase();

    if (!wanted) {
      // mostra guida
      await bot.sendMessage(chatId, renderLangMenu(state.lang));
      return;
    }

    if (!ALLOWED_LANGS.includes(wanted)) {
      await bot.sendMessage(
        chatId,
        `⚠️ Lingua non valida.\n${renderLangMenu(state.lang)}`
      );
      return;
    }

    state.lang = wanted;
    persist();

    await bot.sendMessage(
      chatId,
      `✅ Lingua impostata su: ${wanted.toUpperCase()}.\nScrivi pure, ti rispondo in ${wanted.toUpperCase()}.`
    );
  });

  // /voice
  bot.onText(/^\/voice(?:\s+([a-zA-Z0-9:_-]+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const wanted = match[1]?.trim();

    if (!wanted) {
      await bot.sendMessage(chatId, renderVoiceMenu(state.voice));
      return;
    }

    if (!ALLOWED_VOICES.includes(wanted)) {
      await bot.sendMessage(
        chatId,
        `⚠️ Modello vocale non valido.\n${renderVoiceMenu(state.voice)}`
      );
      return;
    }

    state.voice = wanted;
    persist();

    await bot.sendMessage(
      chatId,
      `✅ Voce impostata su: ${wanted}.\nInvia un messaggio e te lo leggo con questa voce.`
    );
  });

  // /hy
  bot.onText(/^\/hy$/, async (msg) => {
    const chatId = msg.chat.id;
    state.mode = "hy";
    persist();
    await bot.sendMessage(
      chatId,
      "🔀 Modalità impostata su: ibrida (hy).\nCambia con: /book o /free"
    );
  });

  // /book
  bot.onText(/^\/book$/, async (msg) => {
    const chatId = msg.chat.id;
    state.mode = "book";
    persist();
    await bot.sendMessage(
      chatId,
      "📘 Modalità impostata su: libro.\nCambia con: /hy o /free"
    );
  });

  // /free
  bot.onText(/^\/free$/, async (msg) => {
    const chatId = msg.chat.id;
    state.mode = "free";
    persist();
    await bot.sendMessage(
      chatId,
      "🕊️ Modalità impostata su: libera.\nCambia con: /hy o /book"
    );
  });

  // /essence (placeholder)
  bot.onText(/^\/essence$/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(
      chatId,
      "🔮 /essence arriverà nella prossima build (calcolo Cuore–Anima–Visione)."
    );
  });

  // ============= MESSAGGI NORMALI =============
  // qui forziamo la lingua di risposta in base allo stato, anche se l’utente scrive in italiano
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text) return;
    if (text.startsWith("/")) return; // già gestito sopra

    // per ora risposta minimale + voce
    const reply =
      state.lang === "ru"
        ? "Я здесь и слышу тебя. Продолжай."
        : state.lang === "en"
        ? "I am here and I hear you. Go on."
        : "Sono qui e ti ascolto. Continua.";

    // invia testo
    await bot.sendMessage(chatId, reply);

    // invia anche voce con modello scelto
    try {
      await sendVoice(bot, chatId, reply, state.voice, "IRIS 🌸");
    } catch (err) {
      console.error("❌ Errore invio voce:", err);
    }
  });
}
