// src/adapters/telegram_bot.js
// IRIS Telegram adapter — versione senza configManager
// webhook + /lang + /voice visibili + stile CHAT4

import TelegramBot from "node-telegram-bot-api";
import { sendVoice } from "./tts.js";

// lingue consentite
const ALLOWED_LANGS = ["it", "en", "ru"];

// voci / motori TTS consentiti
const ALLOWED_VOICES = [
  "openai:alloy",
  "openai:coral",
  "openai:verse",
  "google:standard",
  "telegram:tts",
  "bark:neural",
];

// menu lingua “bello”
function renderLangMenu(current) {
  return (
    `🌍 Lingua attuale: ${current.toUpperCase()}\n\n` +
    "✏️ Cambia con:\n" +
    "/lang it | en | ru"
  );
}

// menu voce “bello”
function renderVoiceMenu(current) {
  return (
    `🎙️ Voce attuale: ${current}\n\n` +
    "✏️ Cambia con:\n" +
    "/voice openai:alloy | openai:coral | openai:verse | google:standard | telegram:tts | bark:neural"
  );
}

export function bootstrapTelegram(app) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const PUBLIC_BASE_URL =
    process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || "https://telegram-tts.onrender.com";

  if (!TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_TOKEN mancante. Telegram non avviato.");
    return;
  }

  // stato IRIS in memoria (semplice e pulito)
  const state = {
    version: "IRIS 3.0C – 5.x",
    mode: "hy",
    lang: "it",
    voice: "openai:alloy", // tu hai detto: alloy di default
    weights: { heart: 1, soul: 1, vision: 1 },
  };

  // inizializzo bot SENZA polling e SENZA server interno (useremo express)
  const bot = new TelegramBot(TELEGRAM_TOKEN);

  // imposto webhook verso il nostro dominio
  const webhookUrl = `${PUBLIC_BASE_URL}/bot${TELEGRAM_TOKEN}`;
  bot.setWebHook(webhookUrl);
  console.log(`🤖 Telegram Bot attivo in webhook su: ${webhookUrl}`);

  // Express riceve gli update e li gira al bot
  app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // comandi visibili in Telegram (menù del bot)
  bot.setMyCommands([
    { command: "start", description: "Avvia IRIS 🌸" },
    { command: "state", description: "Mostra stato interno 💠" },
    { command: "lang", description: "Cambia lingua (it | en | ru) 🌍" },
    { command: "voice", description: "Cambia modello vocale 🎙️" },
    { command: "hy", description: "Modalità ibrida 🔀" },
    { command: "book", description: "Modalità libro 📘" },
    { command: "free", description: "Modalità libera 🕊️" },
    { command: "essence", description: "Essenza (placeholder) 🔮" },
    { command: "help", description: "Mostra tutti i comandi ✨" },
  ]);

  // ========== /start ==========
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Amico";

    await bot.sendMessage(
      chatId,
      `Ciao ${name} 🌸\nSono IRIS, presente e in ascolto.`
    );

    // guida rapida (come volevi)
    await bot.sendMessage(
      chatId,
      "📘 Guida rapida:\n/lang it | en | ru\n/voice openai:alloy | openai:coral | openai:verse"
    );

    // voce (usa la firma già presente nel tuo tts.js)
    try {
      await sendVoice(bot, chatId, "Ciao, sono IRIS. Ti ascolto con presenza.");
    } catch (err) {
      console.error("Errore invio voce /start:", err);
    }
  });

  // ========== /help ==========
  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    const text =
      "✨ Comandi IRIS\n\n" +
      "🧭 /start – avvia IRIS\n" +
      "💠 /state – stato interno\n" +
      "🌍 /lang – cambia lingua (it, en, ru)\n" +
      "🎙️ /voice – cambia modello vocale\n" +
      "🔀 /hy – modalità ibrida\n" +
      "📘 /book – modalità libro\n" +
      "🕊️ /free – modalità libera\n" +
      "🔮 /essence – (placeholder, prossima build)\n";
    await bot.sendMessage(chatId, text);

    // subito dopo, mostra i 2 menù belli
    await bot.sendMessage(chatId, renderLangMenu(state.lang));
    await bot.sendMessage(chatId, renderVoiceMenu(state.voice));
  });

  // ========== /state ==========
  bot.onText(/^\/state$/, async (msg) => {
    const chatId = msg.chat.id;
    const txt =
      "🧠 Stato di IRIS\n" +
      `• Versione: ${state.version}\n` +
      `• Modalità: ${state.mode}\n` +
      `• Voce: ${state.voice} 🎤\n` +
      `• Lingua: ${state.lang} 🌍\n` +
      `• Pesi: ❤️ ${state.weights.heart} – ✨ ${state.weights.soul} – 💎 ${state.weights.vision}`;
    await bot.sendMessage(chatId, txt);
  });

  // ========== /lang ==========
  bot.onText(/^\/lang(?:\s+([a-zA-Z]{2}))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const wanted = match[1]?.toLowerCase();

    // se non c'è argomento → mostra menù con guida
    if (!wanted) {
      await bot.sendMessage(chatId, renderLangMenu(state.lang));
      return;
    }

    // se c'è argomento ma non è valido
    if (!ALLOWED_LANGS.includes(wanted)) {
      await bot.sendMessage(
        chatId,
        "❌ Lingua non valida.\n" + renderLangMenu(state.lang)
      );
      return;
    }

    state.lang = wanted;
    await bot.sendMessage(
      chatId,
      `✅ Lingua impostata su: ${wanted.toUpperCase()}.\nScrivi pure e ti rispondo in ${wanted.toUpperCase()}.`
    );
  });

  // ========== /voice ==========
  bot.onText(/^\/voice(?:\s+([\w:.-]+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const wanted = match[1]?.toLowerCase();

    if (!wanted) {
      await bot.sendMessage(chatId, renderVoiceMenu(state.voice));
      return;
    }

    if (!ALLOWED_VOICES.includes(wanted)) {
      await bot.sendMessage(
        chatId,
        "❌ Modello non valido.\n" + renderVoiceMenu(state.voice)
      );
      return;
    }

    state.voice = wanted;
    await bot.sendMessage(
      chatId,
      `✅ Voce impostata su: ${wanted}.\nInvia un messaggio e te lo leggo con questa voce.`
    );
  });

  // ========== modalità ==========
  bot.onText(/^\/hy$/, async (msg) => {
    const chatId = msg.chat.id;
    state.mode = "hy";
    await bot.sendMessage(chatId, "🔀 Modalità impostata su: ibrida (hy).");
  });

  bot.onText(/^\/book$/, async (msg) => {
    const chatId = msg.chat.id;
    state.mode = "book";
    await bot.sendMessage(chatId, "📘 Modalità impostata su: libro.");
  });

  bot.onText(/^\/free$/, async (msg) => {
    const chatId = msg.chat.id;
    state.mode = "free";
    await bot.sendMessage(chatId, "🕊️ Modalità impostata su: libera.");
  });

  // ========== /essence (placeholder) ==========
  bot.onText(/^\/essence$/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(
      chatId,
      "🔮 /essence sarà attivo nella build con Coscienza Vettoriale."
    );
  });

  // ========== messaggi normali ==========
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const txt = msg.text?.trim();
    if (!txt) return;
    if (txt.startsWith("/")) return;

    // risposta minimale ma coerente con lingua scelta
    const reply =
      state.lang === "ru"
        ? "Я здесь и слышу тебя. Продолжай."
        : state.lang === "en"
        ? "I am here and I hear you. Go on."
        : "Sono qui e ti ascolto. Continua.";

    await bot.sendMessage(chatId, reply);

    try {
      await sendVoice(bot, chatId, reply);
    } catch (err) {
      console.error("Errore invio voce:", err);
    }
  });
}
