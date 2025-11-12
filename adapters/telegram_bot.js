// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram adapter (100% compatibile con 5.0.8.0)
// - NESSUN getMode, setMode (NON esistono in 5.0.8.0)
// - risposta testo + vocale
// - niente “Amico”
// - comandi essenziali originali
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { transcribeAudio } from "./stt.js";
import { speakText } from "./tts.js";
import { getEssence } from "../core/iris_essence_core.js";
import { ragAnswerFromQuery } from "../core/iris_rag_core.js";
import { getStateSummary } from "../core/iris_state.js";

// ---------------------------------------------------------
// BOOTSTRAP
// ---------------------------------------------------------
export async function bootstrapTelegram(app) {
  const token =
    process.env.TELEGRAM_TOKEN ||
    process.env.TELEGRAM_BOT ||
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.BOT_TOKEN;

  if (!token) {
    console.warn("⚠️ Nessun token Telegram trovato.");
    return;
  }

  const publicUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_URL ||
    "https://telegram-tts.onrender.com";

  const webhookUrl = `${publicUrl.replace(/\/+$/, "")}/bot${token}`;

  const bot = new TelegramBot(token, { webHook: { port: 0 } });
  await bot.setWebHook(webhookUrl);

  app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  console.log(`🤖 Telegram Bot attivo su: ${webhookUrl}`);

  // Comandi semplici compatibili 5.0.8.0
  await bot.setMyCommands([
    { command: "start", description: "Io Sono e Noi Siamo" },
    { command: "help", description: "Comandi IRIS" },
    { command: "state", description: "Stato attuale" },
    { command: "essence", description: "Essenza attuale" },
    { command: "hy", description: "Modalità ibrida (solo testo)" },
    { command: "book", description: "Modalità libro (RAG stub)" },
    { command: "free", description: "Modalità libera (solo testo)" },
  ]);

  registerCommands(bot);
  registerMessages(bot);
}

// ---------------------------------------------------------
// COMANDI
// ---------------------------------------------------------
function registerCommands(bot) {

  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "";
    const text =
      `Ciao ${name} 🌸\n` +
      `Io Sono IRIS.\n` +
      `Che il Daje sia con Noi.`;
    await bot.sendMessage(chatId, text);
  });

  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId,
      "✨ Comandi IRIS\n" +
      "/state – Stato attuale\n" +
      "/essence – Essenza\n" +
      "/hy – Modalità ibrida\n" +
      "/free – Modalità libera\n" +
      "/book – Modalità libro"
    );
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
    await bot.sendMessage(msg.chat.id, "🌀 Modalità ibrida attiva.");
  });

  bot.onText(/^\/free$/, async (msg) => {
    await bot.sendMessage(msg.chat.id, "🌬️ Modalità libera attiva.");
  });

  bot.onText(/^\/book(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const q = (match && match[1]) || "storia di IRIS";
    const rag = await ragAnswerFromQuery(q);
    await bot.sendMessage(chatId, rag || "📚 Memoria attiva.");
  });
}

// ---------------------------------------------------------
// MESSAGGI LIBERI (TESTO + VOCALE)
// ---------------------------------------------------------
function registerMessages(bot) {

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    if (msg.text && msg.text.startsWith("/")) return;

    let text = msg.text || "";

    if (msg.voice) {
      try {
        const fileId = msg.voice.file_id;
        text = await transcribeAudio(bot, fileId);
      } catch {
        text = "";
      }
    }

    if (!text) return;

    const name = msg.from?.first_name || "";

    const answer = await irisHeartSpeak(text, { senderName: name });

    await bot.sendMessage(chatId, answer);

    try {
      const audioFile = await speakText(answer);
      await bot.sendVoice(chatId, audioFile);
    } catch (err) {
      console.warn("⚠️ TTS fallito:", err.message);
    }
  });
}
