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
  console.log("🤖 Telegram Bot attivo (polling puro, IRIS 5.0.1).");

  // /start
  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const text = `Ciao ${msg.from.first_name} 🌸\nSono IRIS, presente e in ascolto.\nPuoi usare /state, /voice, /lang per personalizzarmi.`;
    await bot.sendMessage(chatId, text);
    await sendVoice(bot, chatId, "Ciao, sono IRIS. Ti ascolto con presenza.");
  });

  // /state
  bot.onText(/^\/state/, async (msg) => {
    await bot.sendMessage(msg.chat.id, getStateSummary());
  });

  // /voice
  bot.onText(/^\/voice(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const requested = match[1] ? match[1].trim().toLowerCase() : null;
    const allowed = ["alloy", "coral", "verse", "fable", "onyx", "nova"];

    if (!requested) {
      const current = getVoiceEngine();
      const list = allowed.map((v) => (v === current ? `• ${v} ✅` : `• ${v}`)).join("\n");
      await bot.sendMessage(chatId, `🎤 Voce attuale: ${current}\nPuoi scegliere:\n${list}`);
      return;
    }

    if (!allowed.includes(requested)) {
      await bot.sendMessage(chatId, "❌ Voce non valida. Usa /voice alloy | coral | verse | fable | onyx | nova");
      return;
    }

    setVoiceEngine(requested);
    await bot.sendMessage(chatId, `🗣️ Voce impostata su: ${requested}`);
    await sendVoice(bot, chatId, `Ho impostato la mia voce su ${requested}.`);
  });

  // /lang
  bot.onText(/^\/lang(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const requested = match[1] ? match[1].trim().toLowerCase() : null;
    const allowed = ["it", "en", "ru"];

    if (!requested) {
      const current = getLang();
      const list = allowed.map((v) => (v === current ? `• ${v} ✅` : `• ${v}`)).join("\n");
      await bot.sendMessage(chatId, `🌍 Lingua attuale: ${current}\nPuoi scegliere:\n${list}`);
      return;
    }

    if (!allowed.includes(requested)) {
      await bot.sendMessage(chatId, "❌ Lingua non valida. Usa /lang it | en | ru");
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
