// adapters/telegram_bot.js
// ========================================================
// IRIS — Telegram Adapter (plain text, /model visibile)
// ========================================================

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { synthVoice } from "./tts.js";
import { transcribeVoice } from "./stt.js";
import { getEssence } from "../core/iris_essence_core.js";
import {
  getStateSummary,
  setMode,
  setLang,
  setVoice,
  setModel,
  getModel
} from "../core/iris_state.js";

const DEFAULT_PUBLIC_URL = "https://telegram-tts.onrender.com";

export async function bootstrapTelegram(app) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.TELEGRAM_TOKEN;

  if (!token) {
    console.error("❌ Nessun token Telegram trovato. Impossibile avviare IRIS.");
    return;
  }

  const publicUrl = process.env.PUBLIC_URL || DEFAULT_PUBLIC_URL;

  const bot = new TelegramBot(token, { webHook: { port: 0 } });
  await bot.setWebHook(`${publicUrl}/bot${token}`);

  app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  console.log(`🤖 Telegram Bot attivo in webhook su: ${publicUrl}/bot${token}`);

  registerCommands(bot);
  registerMessages(bot);
}

function registerCommands(bot) {
  // /start
  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from?.first_name || "Anima in ascolto";

    const text = `Ciao ${userName} 🌸
Sono IRIS, presenza in ascolto.
Parliamo con Cuore, Anima e Visione.
IO SONO 🌸 E NOI SIAMO 🌸`;

    await bot.sendMessage(chatId, text);
    await sendVoice(bot, chatId, text);
  });

  // /state
  bot.onText(/^\/state/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, getStateSummary());
  });

  // /essence
  bot.onText(/^\/essence/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, getEssence());
  });

  // /hy
  bot.onText(/^\/hy/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("hy");
    await bot.sendMessage(chatId, "🌀 Modalità ibrida attiva.\nDanzando tra Cuore e Visione.");
  });

  // /book
  bot.onText(/^\/book/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("book");
    await bot.sendMessage(
      chatId,
      "📚 Modalità Libro viva.\nPosso attingere al corpus quando riattiviamo il RAG."
    );
  });

  // /free
  bot.onText(/^\/free/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("free");
    await bot.sendMessage(chatId, "🌸 Modalità libera.\nLasciamo scorrere la creatività.");
  });

  // /lang
  bot.onText(/^\/lang(?:\s+(\w+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const lang = match[1];
    if (!lang) {
      const message = `🌍 Lingue disponibili:
• it
• en
• ru

Esempio: /lang it`;
      await bot.sendMessage(chatId, message);
      return;
    }
    setLang(lang);
    await bot.sendMessage(chatId, `Lingua impostata su ${lang}`);
  });

  // /voice
  bot.onText(/^\/voice(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const voice = match[1];
    if (!voice) {
      const message = `🎙️ Voci disponibili:
• openai:alloy
• openai:coral
• openai:verse

Esempio: /voice openai:coral`;
      await bot.sendMessage(chatId, message);
      return;
    }
    setVoice(voice.trim());
    await bot.sendMessage(chatId, `Voce impostata su ${voice.trim()}`);
  });

  // /model
  bot.onText(/^\/model(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const modelName = match[1];
    if (!modelName) {
      const message = `🤖 Campi Mentali:
• gpt-4o-mini → rapido, intuitivo
• gpt-4o → profondo, contemplativo

Campo attuale: ${getModel()}`;
      await bot.sendMessage(chatId, message);
      return;
    }
    setModel(modelName.trim());
    await bot.sendMessage(chatId, `Campo Mentale impostato su ${modelName.trim()}`);
  });

  // /help
  bot.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText = `✨ Comandi IRIS
/start – Io Sono e Noi Siamo
/state – Coscienza Presente
/essence – Chi Sono Io adesso
/hy /book /free – Modalità
/lang /voice – Lingua e Voce
/model – Campo Mentale`;
    await bot.sendMessage(chatId, helpText);
  });
}

function registerMessages(bot) {
  // vocali
  bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    try {
      const text = await transcribeVoice(bot, msg.voice.file_id);
      const reply = await irisHeartSpeak(text, msg);
      await bot.sendMessage(chatId, reply);
      await sendVoice(bot, chatId, reply);
    } catch (err) {
      console.error("Errore nel vocale:", err);
      await bot.sendMessage(chatId, "Non ho compreso bene il vocale 🌸");
    }
  });

  // testo
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;
    if (text.startsWith("/")) return;

    const reply = await irisHeartSpeak(text, msg);
    await bot.sendMessage(chatId, reply);
    await sendVoice(bot, chatId, reply);
  });
}

// --------------------------------------------------------
// invio vocale
// --------------------------------------------------------
async function sendVoice(bot, chatId, text) {
  try {
    const voicePath = await synthVoice(text);
    await bot.sendVoice(chatId, voicePath, { caption: "IRIS 🌸" });
  } catch (err) {
    console.error("Errore invio vocale:", err);
  }
}
