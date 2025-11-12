// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram adapter (compatibile 5.0.8.0)
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { transcribeAudio } from "./stt.js";
import { generateVoice } from "./tts.js";   // << CORRETTO
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

  await bot.setMyCommands([
    { command: "start", description: "Io Sono e Noi Siamo" },
    { command: "help", description: "Comandi IRIS" },
    { command: "state", description: "Stato attuale" },
    { command: "essence", description: "Essenza" },
    { command: "hy", description: "Modalità Ibrida" },
    { command: "book", description: "Modalità Libro" },
    { command: "free", description: "Modalità Libera" },
  ]);

  registerCommands(bot);
  registerMessages(bot);
}

// ---------------------------------------------------------
// COMANDI TELEGRAM
// ---------------------------------------------------------
function registerCommands(bot) {

  bot.onText(/^\/start$/, async (msg) => {
    const name = msg.from?.first_name || "";
    const txt =
      `Ciao ${name} 🌸\n` +
      `Io Sono IRIS.\n` +
      `Che il Daje sia con Noi.`;
    await bot.sendMessage(msg.chat.id, txt);
  });

  bot.onText(/^\/help$/, async (msg) => {
    await bot.sendMessage(
      msg.chat.id,
      "✨ Comandi IRIS\n" +
      "/state – Stato attuale\n" +
      "/essence – Essenza\n" +
      "/hy – Modalità ibrida\n" +
      "/free – Modalità libera\n" +
      "/book – Modalità libro"
    );
  });

  bot.onText(/^\/state$/, async (msg) => {
    const s = await getStateSummary();
    await bot.sendMessage(msg.chat.id, s);
  });

  bot.onText(/^\/essence$/, async (msg) => {
    const e = await getEssence();
    await bot.sendMessage(msg.chat.id, e);
  });

  bot.onText(/^\/hy$/, async (msg) => {
    await bot.sendMessage(msg.chat.id, "🌀 Modalità ibrida attiva.");
  });

  bot.onText(/^\/free$/, async (msg) => {
    await bot.sendMessage(msg.chat.id, "🌬️ Modalità libera attiva.");
  });

  bot.onText(/^\/book(?:\s+(.+))?$/, async (msg, match) => {
    const q = (match && match[1]) || "storia di IRIS";
    const rag = await ragAnswerFromQuery(q);
    await bot.sendMessage(msg.chat.id, rag.text || "📚 Memoria attiva.");
  });
}

// ---------------------------------------------------------
// MESSAGGI (TESTO + VOCE)
// ---------------------------------------------------------
function registerMessages(bot) {

  bot.on("message", async (msg) => {
    if (msg.text && msg.text.startsWith("/")) return;

    let text = msg.text || "";

    // Se è vocale → STT
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

    // 1) messaggio testuale
    await bot.sendMessage(msg.chat.id, answer);

    // 2) risposta vocale
    try {
      const audioFile = await generateVoice(answer);
      await bot.sendVoice(msg.chat.id, audioFile);
    } catch (err) {
      console.warn("⚠️ TTS non inviato:", err.message);
    }
  });
}
