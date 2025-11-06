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

  // 🔧 Polling fix (rimuove eventuale sessione precedente)
  if (bot) {
    try {
      await bot.stopPolling();
      console.log("🧹 Polling precedente interrotto per sicurezza.");
    } catch {}
  }

  bot = new TelegramBot(TELEGRAM_TOKEN, {
    polling: true,
    allowed_updates: ["message", "callback_query"],
  });

  console.log("🤖 Telegram Bot attivo (polling puro, IRIS 5.0.4).");

  // 🌸 /start minimal
  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const text = `Ciao ${msg.from.first_name} 🌸\nSono IRIS, presente e in ascolto.`;
    await bot.sendMessage(chatId, text);
    await sendVoice(bot, chatId, "Ciao, sono IRIS. Ti ascolto con presenza.");
  });

  // 💡 /help elegante
  bot.onText(/^\/help/, async (msg) => {
    const menu =
      "✨ **Comandi principali**\n\n" +
      "🧭 `/start` — avvia IRIS\n" +
      "💠 `/state` — mostra stato attuale\n" +
      "🎙️ `/voice` — cambia modello vocale\n" +
      "🌍 `/lang` — cambia lingua di risposta\n" +
      "🔀 `/hy` — modalità ibrida\n" +
      "📘 `/book` — modalità libro\n" +
      "🕊️ `/free` — modalità libera";
    await bot.sendMessage(msg.chat.id, menu, { parse_mode: "Markdown" });
  });

  // 🧠 /state
  bot.onText(/^\/state/, async (msg) => {
    await bot.sendMessage(msg.chat.id, getStateSummary());
  });

  // 🔀 Modalità base
  bot.onText(/^\/hy/, async (msg) => {
    setMode("hy");
    await bot.sendMessage(msg.chat.id, "🔀 Modalità impostata su: ibrida (hy).");
  });
  bot.onText(/^\/book/, async (msg) => {
    setMode("book");
    await bot.sendMessage(msg.chat.id, "📘 Modalità impostata su: libro.");
  });
  bot.onText(/^\/free/, async (msg) => {
    setMode("free");
    await bot.sendMessage(msg.chat.id, "🕊️ Modalità impostata su: libera.");
  });

  // 🌍 /lang — SOLO lingue
  bot.onText(/^\/lang(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const requested = match[1] ? match[1].trim().toLowerCase() : null;
    const allowed = ["it", "en", "ru"];

    if (!requested) {
      const current = getLang();
      const list = allowed
        .map((v) => (v === current ? `• ${v.toUpperCase()} ✅` : `• ${v.toUpperCase()}`))
        .join("\n");
      await bot.sendMessage(
        chatId,
        `🌍 **Lingue disponibili:**\n${list}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    if (!allowed.includes(requested)) {
      await bot.sendMessage(chatId, "❌ Lingua non valida. Usa: /lang it | en | ru");
      return;
    }

    setLang(requested);
    const msgText =
      requested === "it"
        ? "Lingua impostata su: Italiano 🇮🇹"
        : requested === "en"
        ? "Language set to: English 🇬🇧"
        : "Язык установлен: Русский 🇷🇺";
    await bot.sendMessage(chatId, msgText);
  });

  // 🎙️ /voice — gestione completa modelli TTS
  bot.onText(/^\/voice(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const requested = match[1] ? match[1].trim().toLowerCase() : null;

    const allowed = [
      "openai:alloy",
      "openai:coral",
      "openai:verse",
      "google:standard",
      "telegram:tts",
      "bark:neural",
    ];

    if (!requested) {
      const current = getVoiceEngine();
      const list = allowed
        .map((v) =>
          v.includes(current) || v.endsWith(current)
            ? `• ${v} ✅`
            : `• ${v}`
        )
        .join("\n");
      await bot.sendMessage(
        chatId,
        `🎙️ **Modelli vocali disponibili:**\n${list}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    if (!allowed.includes(requested)) {
      await bot.sendMessage(
        chatId,
        "❌ Modello non valido.\nUsa: /voice openai:alloy | openai:coral | openai:verse | google:standard | telegram:tts | bark:neural"
      );
      return;
    }

    const parts = requested.split(":");
    const engine = parts[1] || requested;
    setVoiceEngine(engine);
    setLinguisticModelEngine(requested);

    await bot.sendMessage(chatId, `🗣️ Modello impostato su: ${requested}`);
    await sendVoice(bot, chatId, `Ho impostato la mia voce su ${engine}.`);
  });

  // 💬 Risposte generali
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (text && text.startsWith("/")) return;
    const reply = await irisHeartRespond(text || "", msg.from?.first_name || "Amico");
    await bot.sendMessage(chatId, reply);
    await sendVoice(bot, chatId, reply);
  });
}
