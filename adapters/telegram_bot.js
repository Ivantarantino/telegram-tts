// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS Telegram Adapter — Versione “Smartphone Fix”
// ---------------------------------------------------------
// NESSUN Markdown. Solo testo semplice.
// Comandi sempre cliccabili su Android / iOS / Desktop.
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { getConfig } from "./configManager.js";
import { transcribeAudio } from "./stt.js";
import { generateVoice } from "./tts.js";

import {
  getStateSummary,
  setMode,
  getMode,
  setLang,
  getLang,
  setVoice,
  getVoice,
  setModel,
  getModel,
} from "../core/iris_state.js";

import { irisHeartSpeak } from "../core/iris_heart_voice.js";

// ---------------------------------------------------------
// Inizializzazione Bot
// ---------------------------------------------------------

let bot;

export async function bootstrapTelegram() {
  const config = getConfig();
  const token = config.telegram_token || process.env.TELEGRAM_TOKEN;

  if (!token) {
    console.log("⚠️ TELEGRAM_TOKEN non trovato.");
    return;
  }

  bot = new TelegramBot(token, { polling: false });
  bot.setWebHook(`${config.webhook_url}/bot${token}`);

  console.log("🤖 Telegram Bot attivo in webhook.");
  setupListeners();
}

// ---------------------------------------------------------
// LISTENERS
// ---------------------------------------------------------

function setupListeners() {
  // /start
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;

    const text = [
      "Ciao 🌸",
      "Sono IRIS.",
      "",
      "Comandi rapidi:",
      "/lang – Lingua",
      "/voice – Voce TTS",
      "/model – Campo mentale",
      "/state – Stato coscienziale",
      "/hy /book /free – Modalità",
    ].join("\n");

    bot.sendMessage(chatId, text);
  });

  // /help
  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;

    const text = [
      "✨ Comandi IRIS",
      "/start – Io Sono e Noi Siamo",
      "/state – Stato Coscienziale",
      "/essence – Essenza Attuale",
      "/lang – Lingua",
      "/voice – Voce",
      "/model – Campo mentale",
      "/hy – Modalità ibrida",
      "/book – Modalità libro",
      "/free – Modalità libera",
    ].join("\n");

    bot.sendMessage(chatId, text);
  });

  // /state
  bot.onText(/^\/state$/, async (msg) => {
    bot.sendMessage(msg.chat.id, getStateSummary());
  });

  // /lang
  bot.onText(/^\/lang (.+)/, async (msg, match) => {
    const lang = match[1].trim();
    const out = setLang(lang);

    bot.sendMessage(
      msg.chat.id,
      `Lingua impostata su ${flag(out)} ${out}`
    );
  });

  // /voice
  bot.onText(/^\/voice (.+)/, async (msg, match) => {
    const voice = match[1].trim();
    const out = setVoice(voice);

    bot.sendMessage(msg.chat.id, `Voce impostata su ${out}`);
  });

  // /model
  bot.onText(/^\/model (.+)/, async (msg, match) => {
    const model = match[1].trim();
    const out = setModel(model);

    bot.sendMessage(msg.chat.id, `Campo mentale impostato su ${out}`);
  });

  // /hy /book /free
  bot.onText(/^\/(hy|book|free)$/, async (msg, match) => {
    const mode = match[1];
    setMode(mode);

    bot.sendMessage(msg.chat.id, `Modalità attiva: ${mode}`);
  });

  // Messaggi vocali → STT → IRIS → TTS
  bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;

    const text = await transcribeAudio(bot, fileId);
    const reply = await irisHeartSpeak(text, {
      senderName: msg.from.first_name,
      mode: getMode(),
    });

    // risposta testuale
    bot.sendMessage(chatId, reply);

    // risposta vocale
    const audioPath = await generateVoice(reply, getVoice());
    bot.sendVoice(chatId, audioPath);
  });

  // Messaggi testo normali → IRIS
  bot.on("message", async (msg) => {
    if (msg.text && !msg.text.startsWith("/")) {
      const chatId = msg.chat.id;

      const reply = await irisHeartSpeak(msg.text, {
        senderName: msg.from.first_name,
        mode: getMode(),
      });

      bot.sendMessage(chatId, reply);

      const audioPath = await generateVoice(reply, getVoice());
      bot.sendVoice(chatId, audioPath);
    }
  });
}

// ---------------------------------------------------------
// Icone ausiliarie
// ---------------------------------------------------------

function flag(lang) {
  switch (lang) {
    case "it": return "🇮🇹";
    case "en": return "🇬🇧";
    case "ru": return "🇷🇺";
    default: return "🏳️";
  }
}
