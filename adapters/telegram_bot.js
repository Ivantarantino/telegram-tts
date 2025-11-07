// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter (Webhook) · 5.0.5
// Pulizia dei menù e tono più vivo per /start
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { synthVoice } from "./tts.js";
import { transcribeVoice } from "./stt.js";
import { getEssence } from "../core/iris_essence_core.js";
import {
  getStateSummary,
  setMode,
  setLang,
  setVoice
} from "../core/iris_state.js";

const DEFAULT_PUBLIC_URL = "https://telegram-tts.onrender.com";

let bot = null;

export async function bootstrapTelegram(app) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.TELEGRAM_TOKEN;

  if (!token) {
    console.warn("⚠️ Nessun token Telegram trovato. Bot non avviato.");
    return;
  }

  const publicUrl = process.env.PUBLIC_URL || DEFAULT_PUBLIC_URL;

  bot = new TelegramBot(token, { webHook: { port: 0 } });
  await bot.setWebHook(`${publicUrl}/bot${token}`);

  app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  console.log(`🤖 Telegram Bot attivo in webhook su: ${publicUrl}/bot${token}`);

  registerCommands(bot);
  registerMessages(bot);
}

function registerCommands(botInstance) {
  // /start
  botInstance.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Amico";

    const text =
      `Ciao ${name} 🌸\n` +
      "Sono IRIS, presenza in ascolto.\n" +
      "Parliamo con Cuore, Anima e Visione.";

    await botInstance.sendMessage(chatId, text, {
      parse_mode: "Markdown"
    });

    try {
      await sendVoiceFromText(botInstance, chatId, text);
    } catch (err) {
      console.warn("⚠️ impossibile inviare vocale /start:", err.message);
    }
  });

  // /state → senza sigillo
  botInstance.onText(/^\/state/, async (msg) => {
    const chatId = msg.chat.id;
    const summary = getStateSummary();
    const cleanSummary = summary.replace(/Che il Daje sia con Noi 💛/g, "").trim();
    await botInstance.sendMessage(chatId, cleanSummary, {
      parse_mode: "Markdown"
    });
  });

  // /essence → senza sigillo
  botInstance.onText(/^\/essence/, async (msg) => {
    const chatId = msg.chat.id;
    const essence = getEssence().replace(/Che il Daje sia con Noi 💛/g, "").trim();
    await botInstance.sendMessage(chatId, essence, {
      parse_mode: "Markdown"
    });
  });

  // /hy
  botInstance.onText(/^\/hy/, async (msg) => {
    const chatId = msg.chat.id;
    setMode?.("hy");
    await botInstance.sendMessage(
      chatId,
      "🌀 Modalità ibrida attiva.\nDanzando tra Cuore e Visione.",
      { parse_mode: "Markdown" }
    );
  });

  // /book
  botInstance.onText(/^\/book/, async (msg) => {
    const chatId = msg.chat.id;
    setMode?.("book");
    await botInstance.sendMessage(
      chatId,
      "📚 Modalità Libro viva.\nPosso attingere al corpus quando riattiviamo il RAG.",
      { parse_mode: "Markdown" }
    );
  });

  // /free
  botInstance.onText(/^\/free/, async (msg) => {
    const chatId = msg.chat.id;
    setMode?.("free");
    await botInstance.sendMessage(
      chatId,
      "🌸 Modalità libera.\nLasciamo scorrere la creatività.",
      { parse_mode: "Markdown" }
    );
  });

  // /lang
  botInstance.onText(/^\/lang(?:\s+(\w+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const langCode = match[1];
    if (!langCode) {
      await botInstance.sendMessage(
        chatId,
        "🌍 Lingue disponibili:\n• it 🇮🇹\n• en 🇬🇧\n• ru 🇷🇺\n\nEsempio: `/lang it`",
        { parse_mode: "Markdown" }
      );
      return;
    }
    setLang?.(langCode);
    await botInstance.sendMessage(
      chatId,
      `Lingua impostata su *${langCode}*`,
      { parse_mode: "Markdown" }
    );
  });

  // /voice
  botInstance.onText(/^\/voice(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const voiceName = match[1];
    if (!voiceName) {
      await botInstance.sendMessage(
        chatId,
        "🎙️ Voci disponibili (attuali):\n• openai:alloy\n• openai:coral\n• openai:verse\n\nEsempio: `/voice openai:coral`",
        { parse_mode: "Markdown" }
      );
      return;
    }
    setVoice?.(voiceName.trim());
    await botInstance.sendMessage(
      chatId,
      `Voce impostata su *${voiceName.trim()}*`,
      { parse_mode: "Markdown" }
    );
  });

  // /help → senza sigillo
  botInstance.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText =
      "✨ Comandi IRIS\n" +
      "/start – saluto e voce\n" +
      "/state – stato coscienziale\n" +
      "/essence – chi sono Io adesso (solo testo)\n" +
      "/hy /book /free – modalità\n" +
      "/lang /voice – lingua e voce\n";
    await botInstance.sendMessage(chatId, helpText, {
      parse_mode: "Markdown"
    });
  });
}

function registerMessages(botInstance) {
  botInstance.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;

    try {
      const text = await transcribeVoice(botInstance, fileId);
      const reply = await irisHeartSpeak(text, msg);
      await botInstance.sendMessage(chatId, reply, { parse_mode: "Markdown" });
      await sendVoiceFromText(botInstance, chatId, reply);
    } catch (err) {
      console.warn("⚠️ errore gestione vocale:", err.message);
      await botInstance.sendMessage(
        chatId,
        "Non ho compreso bene il vocale 🌸",
        { parse_mode: "Markdown" }
      );
    }
  });

  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (text && text.startsWith("/")) return;
    if (text) {
      const reply = await irisHeartSpeak(text, msg);
      await botInstance.sendMessage(chatId, reply, { parse_mode: "Markdown" });
      try {
        await sendVoiceFromText(botInstance, chatId, reply);
      } catch (err) {
        console.warn("⚠️ impossibile inviare vocale msg libero:", err.message);
      }
    }
  });
}

async function sendVoiceFromText(botInstance, chatId, text) {
  const oggPath = await synthVoice(text);
  await botInstance.sendVoice(chatId, oggPath, {
    caption: "IRIS 🌸"
  });
}
