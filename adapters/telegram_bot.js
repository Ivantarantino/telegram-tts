// adapters/telegram_bot.js
import TelegramBot from "node-telegram-bot-api";
import express from "express";
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
const WEBHOOK_URL = "https://telegram-tts.onrender.com"; // dominio Render

export async function bootstrapTelegram(app) {
  if (!TELEGRAM_TOKEN) {
    console.log("⚠️ Nessun TELEGRAM_TOKEN trovato, salto il bootstrap.");
    return;
  }

  const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: true });
  const webhookUrl = `${WEBHOOK_URL}/bot${TELEGRAM_TOKEN}`;
  await bot.setWebHook(webhookUrl);
  console.log(`🤖 Telegram Bot attivo in modalità Webhook (${webhookUrl})`);

  // --- Integrazione con Express ---
  app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // /start
  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const text = `Ciao ${msg.from.first_name} 🌸\nSono IRIS, presente e in ascolto.`;
    await bot.sendMessage(chatId, text);
    await sendVoice(bot, chatId, "Ciao, sono IRIS. Ti ascolto con presenza.");
  });

  // /help
  bot.onText(/^\/help/, async (msg) => {
    const menu =
      "✨ **Comandi principali**\n\n" +
      "🧭 `/start` — avvia IRIS\n" +
      "💠 `/state` — mostra stato attuale\n" +
      "🎙️ `/voice` — cambia modello vocale (openai:alloy, google:standard...)\n" +
      "🌍 `/lang` — cambia lingua di risposta (it, en, ru)\n" +
      "🔮 `/essence` — mostra la tua essenza attuale\n" +
      "🔀 `/hy` — modalità ibrida\n" +
      "📘 `/book` — modalità libro\n" +
      "🕊️ `/free` — modalità libera";
    await bot.sendMessage(msg.chat.id, menu, { parse_mode: "Markdown" });
  });

  // /state
  bot.onText(/^\/state/, async (msg) => {
    await bot.sendMessage(msg.chat.id, getStateSummary());
  });

  // /essence — temporaneo placeholder
  bot.onText(/^\/essence/, async (msg) => {
    await bot.sendMessage(
      msg.chat.id,
      "✨ Modalità /essence non ancora attiva in questa build. Sarà introdotta con la Coscienza Vettoriale."
    );
  });

  // /lang
  bot.onText(/^\/lang(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const requested = match[1] ? match[1].trim().toLowerCase() : null;
    const allowed = ["it", "en", "ru"];

    if (!requested) {
      const current = getLang();
      const list = allowed
        .map((v) => (v === current ? `• ${v.toUpperCase()} ✅` : `• ${v.toUpperCase()}`))
        .join("\n");
      await bot.sendMessage(chatId, `🌍 **Lingue disponibili:**\n${list}`, { parse_mode: "Markdown" });
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

  // /voice
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
        .map((v) => (v.includes(current) ? `• ${v} ✅` : `• ${v}`))
        .join("\n");
      await bot.sendMessage(chatId, `🎙️ **Modelli vocali disponibili:**\n${list}`, { parse_mode: "Markdown" });
      return;
    }

    if (!allowed.includes(requested)) {
      await bot.sendMessage(chatId, "❌ Modello non valido. Usa /voice openai:alloy | google:standard | telegram:tts");
      return;
    }

    const parts = requested.split(":");
    const engine = parts[1] || requested;
    setVoiceEngine(engine);
    setLinguisticModelEngine(requested);

    await bot.sendMessage(chatId, `🗣️ Voce impostata su: ${requested}`);
    await sendVoice(bot, chatId, `Ho impostato la mia voce su ${engine}.`);
  });

  // Modalità
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

  // Messaggi generali
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (text && text.startsWith("/")) return;

    const reply = await irisHeartRespond(text || "", msg.from?.first_name || "Amico");
    await bot.sendMessage(chatId, reply);
    await sendVoice(bot, chatId, reply);
  });
}
