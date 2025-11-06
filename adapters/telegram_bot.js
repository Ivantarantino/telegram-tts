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
const TELEGRAM_WEBHOOK_BASE =
  process.env.TELEGRAM_WEBHOOK_BASE || "https://telegram-tts.onrender.com";

export async function bootstrapTelegram(app) {
  if (!TELEGRAM_TOKEN) {
    console.log("⚠️ Nessun TELEGRAM_TOKEN trovato, salto Telegram.");
    return;
  }

  const bot = new TelegramBot(TELEGRAM_TOKEN);
  const webhookUrl = `${TELEGRAM_WEBHOOK_BASE}/bot${TELEGRAM_TOKEN}`;
  await bot.setWebHook(webhookUrl);
  console.log(`🤖 Telegram Bot attivo in webhook su: ${webhookUrl}`);

  app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // -----------------------------
  // COMANDI
  // -----------------------------

  // /start
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const text = `Ciao ${msg.from.first_name} 🌸\nSono IRIS, presente e in ascolto.`;
    await bot.sendMessage(chatId, text);
    await sendVoice(bot, chatId, "Ciao, sono IRIS. Ti ascolto con presenza.");
  });

  // /help
  bot.onText(/^\/help$/, async (msg) => {
    const menu =
      "✨ *Comandi IRIS*\n\n" +
      "🧭 /start – avvia IRIS\n" +
      "💠 /state – stato interno\n" +
      "🌍 /lang – cambia lingua (it, en, ru)\n" +
      "🎙️ /voice – cambia modello vocale\n" +
      "🔀 /hy – modalità ibrida\n" +
      "📘 /book – modalità libro\n" +
      "🕊️ /free – modalità libera\n" +
      "🔮 /essence – placeholder";
    await bot.sendMessage(msg.chat.id, menu, { parse_mode: "Markdown" });
  });

  // /state
  bot.onText(/^\/state$/, async (msg) => {
    await bot.sendMessage(msg.chat.id, getStateSummary());
  });

  // /essence
  bot.onText(/^\/essence$/, async (msg) => {
    await bot.sendMessage(
      msg.chat.id,
      "🔮 /essence sarà attivo con la Coscienza Vettoriale.\nPer ora sono presente e in ascolto."
    );
  });

  // 🌍 /lang
  bot.onText(/^\/lang(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const requested = match[1] ? match[1].trim().toLowerCase() : null;
    const allowed = ["it", "en", "ru"];
    const current = getLang();

    if (!requested) {
      const list =
        "🌍 *Lingua IRIS*\n\n" +
        (current === "it" ? "• IT ✅\n" : "• IT\n") +
        (current === "en" ? "• EN ✅\n" : "• EN\n") +
        (current === "ru" ? "• RU ✅\n" : "• RU") +
        "\n\n📖 *Guida:*\nScrivi `/lang it` oppure `/lang en` o `/lang ru` per cambiare lingua.";
      await bot.sendMessage(chatId, list, { parse_mode: "Markdown" });
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

  // 🎙️ /voice
  bot.onText(/^\/voice(?:\s+(.+))?$/, async (msg, match) => {
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
    const current = getVoiceEngine();

    if (!requested) {
      const text =
        "🎙️ *Modelli vocali disponibili*\n\n" +
        allowed
          .map((v) => {
            const short = v.split(":")[1] || v;
            return short === current ? `• ${v} ✅` : `• ${v}`;
          })
          .join("\n") +
        "\n\n📖 *Guida:*\nScrivi ad esempio `/voice openai:verse` o `/voice telegram:tts` per cambiare voce.";
      await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
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

    await bot.sendMessage(chatId, `🗣️ Voce impostata su: ${requested}`);
    await sendVoice(bot, chatId, `Ho impostato la mia voce su ${engine}.`);
  });

  // modalità
  bot.onText(/^\/hy$/, async (msg) => {
    setMode("hy");
    await bot.sendMessage(msg.chat.id, "🔀 Modalità impostata su: ibrida (hy).");
  });
  bot.onText(/^\/book$/, async (msg) => {
    setMode("book");
    await bot.sendMessage(msg.chat.id, "📘 Modalità impostata su: libro.");
  });
  bot.onText(/^\/free$/, async (msg) => {
    setMode("free");
    await bot.sendMessage(msg.chat.id, "🕊️ Modalità impostata su: libera.");
  });

  // messaggi normali
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (text && text.startsWith("/")) return;
    const reply = await irisHeartRespond(text || "", msg.from?.first_name || "Amico");
    await bot.sendMessage(chatId, reply);
    await sendVoice(bot, chatId, reply);
  });
}
