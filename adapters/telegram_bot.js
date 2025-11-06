// adapters/telegram_bot.js
import TelegramBot from "node-telegram-bot-api";
import { sendVoice } from "./tts.js";
import {
  getStateSummary,
  setMode,
  setVoiceEngine,
  getVoiceEngine,
  setLang,
  getLang,
  setLinguisticModelEngine,
} from "../core/iris_state.js";
import { irisHeartRespond } from "../core/iris_heart_voice.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
let bot = null;

export async function bootstrapTelegram() {
  if (!TELEGRAM_TOKEN) {
    console.log("⚠️ Nessun TELEGRAM_TOKEN trovato, salto il bootstrap.");
    return;
  }

  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  console.log("🤖 Telegram Bot attivo (polling puro, IRIS 5.0.3).");

  // /start
  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const text = `Ciao ${msg.from.first_name} 🌸\nSono IRIS, presente e in ascolto.`;
    await bot.sendMessage(chatId, text);
    await sendVoice(bot, chatId, "Ciao, sono IRIS. Ti ascolto con presenza.");
  });

  // /help
  bot.onText(/^\/help/, async (msg) => {
    await bot.sendMessage(
      msg.chat.id,
      "✨ Comandi disponibili:\n" +
        "/start — avvia IRIS\n" +
        "/state — stato interno\n" +
        "/voice — cambia voce\n" +
        "/lang — cambia lingua o motore linguistico\n" +
        "/hy — modalità ibrida\n" +
        "/book — modalità libro\n" +
        "/free — modalità libera"
    );
  });

  // /state
  bot.onText(/^\/state/, async (msg) => {
    await bot.sendMessage(msg.chat.id, getStateSummary());
  });

  // /hy
  bot.onText(/^\/hy/, async (msg) => {
    setMode("hy");
    await bot.sendMessage(msg.chat.id, "🔀 Modalità impostata su: ibrida (hy).");
  });

  // /book
  bot.onText(/^\/book/, async (msg) => {
    setMode("book");
    await bot.sendMessage(msg.chat.id, "📘 Modalità impostata su: libro.");
  });

  // /free
  bot.onText(/^\/free/, async (msg) => {
    setMode("free");
    await bot.sendMessage(msg.chat.id, "🕊️ Modalità impostata su: libera.");
  });

  // /lang — cambia lingua o motore linguistico
  bot.onText(/^\/lang(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const requested = match[1] ? match[1].trim().toLowerCase() : null;

    // Motori linguistici (openai, google, telegram, bark, ecc.)
    const modelEngines = [
      "openai:alloy",
      "openai:coral",
      "openai:verse",
      "google:standard",
      "telegram:tts",
      "bark:neural",
    ];

    if (!requested) {
      const currentLang = getLang();
      const listLang = ["it", "en", "ru"]
        .map((v) => (v === currentLang ? `• ${v} ✅` : `• ${v}`))
        .join("\n");
      const listModels = modelEngines.join("\n");
      await bot.sendMessage(
        chatId,
        `🌍 Lingue disponibili:\n${listLang}\n\n🎙️ Modelli linguistici:\n${listModels}`
      );
      return;
    }

    // Se è una lingua
    if (["it", "en", "ru"].includes(requested)) {
      setLang(requested);
      const msgText =
        requested === "it"
          ? "Lingua impostata su: Italiano 🇮🇹"
          : requested === "en"
          ? "Language set to: English 🇬🇧"
          : "Язык установлен: Русский 🇷🇺";
      await bot.sendMessage(chatId, msgText);
      return;
    }

    // Se è un modello linguistico
    if (modelEngines.includes(requested)) {
      setLinguisticModelEngine(requested);
      await bot.sendMessage(chatId, `🧠 Modello linguistico impostato su: ${requested}`);
      return;
    }

    await bot.sendMessage(
      chatId,
      "❌ Comando non valido. Usa /lang it | en | ru oppure /lang openai:alloy | google:standard | telegram:tts"
    );
  });

  // --- MESSAGGI NORMALI ---
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (text && text.startsWith("/")) return;

    const reply = await irisHeartRespond(text || "", msg.from?.first_name || "Amico");
    await bot.sendMessage(chatId, reply);
    await sendVoice(bot, chatId, reply);
  });
}
