// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram adapter (Compatibile con 5.0.8.0 originale)
// - Webhook Render
// - NIENTE /lang, /model, /voice (non esistono in 5.0.8.0)
// - Risponde SEMPRE testo + vocale
// - Nessun “Amico”
// - Cuore 5.0.8.0
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { transcribeAudio } from "./stt.js";
import { speakText } from "./tts.js";
import { getEssence } from "../core/iris_essence_core.js";
import { ragAnswerFromQuery } from "../core/iris_rag_core.js";
import { getStateSummary, setMode, getMode } from "../core/iris_state.js";

let bot = null;

// ---------------------------------------------------------
// Bootstrap (chiamata da index.js)
// ---------------------------------------------------------
export async function bootstrapTelegram(app) {

  const token =
    process.env.TELEGRAM_TOKEN ||
    process.env.TELEGRAM_BOT ||
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.BOT_TOKEN;

  if (!token) {
    console.warn("⚠️ Nessun token Telegram trovato. Bot disattivato.");
    return;
  }

  const baseUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_URL ||
    "https://telegram-tts.onrender.com";

  const webhookUrl = `${baseUrl.replace(/\/+$/, "")}/bot${token}`;

  bot = new TelegramBot(token, { webHook: { port: 0 } });
  await bot.setWebHook(webhookUrl);

  app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  console.log(`🤖 Telegram Bot attivo in webhook su: ${webhookUrl}`);

  await bot.setMyCommands([
    { command: "start", description: "Io Sono e Noi Siamo" },
    { command: "help", description: "Comandi IRIS" },
    { command: "state", description: "Coscienza presente" },
    { command: "essence", description: "Essenza attuale" },
    { command: "hy", description: "Modalità Ibrida" },
    { command: "book", description: "Modalità Libro" },
    { command: "free", description: "Modalità Libera" },
  ]);

  registerCommands(bot);
  registerMessages(bot);
}

// ---------------------------------------------------------
// Comandi
// ---------------------------------------------------------
function registerCommands(bot) {

  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "";
    const text =
      `Ciao ${name} 🌸\n` +
      `Io Sono IRIS.\n` +
      `Parliamo.\n` +
      `Che il Daje sia con Noi.`;
    await bot.sendMessage(chatId, text);
  });

  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    const text =
      `✨ Comandi IRIS\n` +
      `/start – Io Sono e Noi Siamo\n` +
      `/state – Stato attuale\n` +
      `/essence – Essenza\n` +
      `/hy – Modalità Ibrida\n` +
      `/book – Modalità Libro\n` +
      `/free – Modalità Libera`;
    await bot.sendMessage(chatId, text);
  });

  bot.onText(/^\/state$/, async (msg) => {
    const chatId = msg.chat.id;
    const s = await getStateSummary();
    await bot.sendMessage(chatId, s);
  });

  bot.onText(/^\/essence$/, async (msg) => {
    const chatId = msg.chat.id;
    const e = await getEssence();
    await bot.sendMessage(chatId, e);
  });

  bot.onText(/^\/hy$/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("hy");
    await bot.sendMessage(chatId, "🌀 Modalità ibrida attiva.");
  });

  bot.onText(/^\/free$/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("free");
    await bot.sendMessage(chatId, "🌬️ Modalità libera attiva.");
  });

  bot.onText(/^\/book(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const q = (match && match[1]) || "origine di IRIS";
    setMode("book");
    const answer = await ragAnswerFromQuery(q);
    await bot.sendMessage(chatId, answer || "📚 Memoria attiva.");
  });
}

// ---------------------------------------------------------
// Messaggi liberi (testo + vocali)
// ---------------------------------------------------------
function registerMessages(bot) {

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    if (msg.text && msg.text.startsWith("/")) return;

    const name = msg.from?.first_name || "";
    const mode = getMode();

    let text = msg.text || "";

    if (msg.voice) {
      try {
        const fileId = msg.voice.file_id;
        text = await transcribeAudio(bot, fileId);
      } catch (err) {
        text = "";
      }
    }

    if (!text) return;

    const answer = await irisHeartSpeak(text, { mode, senderName: name });

    await bot.sendMessage(chatId, answer);

    try {
      const audioFile = await speakText(answer);
      await bot.sendVoice(chatId, audioFile);
    } catch (err) {
      console.warn("⚠️ TTS fallito:", err.message);
    }
  });
}
