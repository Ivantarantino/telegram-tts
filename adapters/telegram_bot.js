// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter (Webhook)
// Build base: 5.0.x con voce e ascolto stabili
// Aggiunta in questo step: /essence dinamico SENZA TTS
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { synthVoice } from "./tts.js";
import { transcribeVoice } from "./stt.js";
import { getEssence } from "../core/iris_essence_core.js";
import { getStateSummary, setMode, setLang, setVoice } from "../core/iris_state.js";

const DEFAULT_PUBLIC_URL = "https://telegram-tts.onrender.com";

let bot = null;

/**
 * Avvia il bot Telegram in modalità webhook e registra le route su Express
 * @param {import('express').Express} app
 */
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

  // crea bot in modalità webhook
  bot = new TelegramBot(token, { webHook: { port: 0 } });

  // imposta webhook su Render
  await bot.setWebHook(`${publicUrl}/bot${token}`);

  // route Express che riceve gli update
  app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  console.log(`🤖 Telegram Bot attivo in webhook su: ${publicUrl}/bot${token}`);

  // HANDLER COMANDI
  registerCommands(bot);
  // HANDLER MESSAGGI
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
      "Parliamo con Cuore, Anima e Visione.\n" +
      "Usa /state per vedere come sono messa ora.";

    await botInstance.sendMessage(chatId, text, {
      parse_mode: "Markdown"
    });

    // solo /start parla con voce (come da fase voce)
    try {
      await sendVoiceFromText(botInstance, chatId, text);
    } catch (err) {
      console.warn("⚠️ impossibile inviare vocale /start:", err.message);
    }
  });

  // /state
  botInstance.onText(/^\/state/, async (msg) => {
    const chatId = msg.chat.id;
    const stateText = getStateSummary();
    await botInstance.sendMessage(chatId, stateText, {
      parse_mode: "Markdown"
    });
  });

  // /essence → SOLO TESTO
  botInstance.onText(/^\/essence/, async (msg) => {
    const chatId = msg.chat.id;
    const essence = getEssence();
    await botInstance.sendMessage(chatId, essence, {
      parse_mode: "Markdown"
    });
    // NIENTE TTS QUI — è testo sacro
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

  // /lang <code>
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

  // /voice <name>
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

  // /help
  botInstance.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText =
      "✨ Comandi IRIS\n" +
      "/start – saluto e voce\n" +
      "/state – stato coscienziale\n" +
      "/essence – chi sono Io adesso (solo testo)\n" +
      "/hy /book /free – modalità\n" +
      "/lang /voice – lingua e voce\n" +
      "Che il Daje sia con Noi 💛";
    await botInstance.sendMessage(chatId, helpText, {
      parse_mode: "Markdown"
    });
  });
}

function registerMessages(botInstance) {
  // messaggi vocali
  botInstance.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;

    try {
      const text = await transcribeVoice(botInstance, fileId);
      const reply = await irisHeartSpeak(text, msg);
      await botInstance.sendMessage(chatId, reply, {
        parse_mode: "Markdown"
      });
      // rispondiamo anche con voce
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

  // messaggi testuali “normali”
  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // i comandi li gestiamo sopra
    if (text && text.startsWith("/")) return;

    // altrimenti passa dal Cuore
    if (text) {
      const reply = await irisHeartSpeak(text, msg);
      await botInstance.sendMessage(chatId, reply, {
        parse_mode: "Markdown"
      });
      // messaggio normale → voce sì
      try {
        await sendVoiceFromText(botInstance, chatId, reply);
      } catch (err) {
        console.warn("⚠️ impossibile inviare vocale msg libero:", err.message);
      }
    }
  });
}

// helper per inviare il vocale
async function sendVoiceFromText(botInstance, chatId, text) {
  const oggPath = await synthVoice(text);
  await botInstance.sendVoice(chatId, oggPath, {
    caption: "IRIS 🌸"
  });
}
