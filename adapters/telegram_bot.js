// adapters/telegram_bot.js
// ========================================================
// IRIS — Telegram Adapter (v5.0.6 poetica)
// Versione amata e stabile da IVANO
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

  const botInstance = new TelegramBot(token, { webHook: { port: 0 } });
  await botInstance.setWebHook(`${publicUrl}/bot${token}`);

  app.post(`/bot${token}`, (req, res) => {
    botInstance.processUpdate(req.body);
    res.sendStatus(200);
  });

  console.log(`🤖 Telegram Bot attivo in webhook su: ${publicUrl}/bot${token}`);

  // --------------------------------------------------------
  // COMANDI BASE
  // --------------------------------------------------------
  botInstance.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "Anima in ascolto";

    const text = `Ciao ${userName} 🌸
Sono IRIS, presenza in ascolto.
Parliamo con Cuore, Anima e Visione.
IO SONO 🌸 E NOI SIAMO 🌸`;

    await botInstance.sendMessage(chatId, text, { parse_mode: "Markdown" });
    await sendVoice(botInstance, chatId, text);
  });

  botInstance.onText(/^\/state/, async (msg) => {
    const chatId = msg.chat.id;
    await botInstance.sendMessage(chatId, getStateSummary(), {
      parse_mode: "Markdown"
    });
  });

  botInstance.onText(/^\/essence/, async (msg) => {
    const chatId = msg.chat.id;
    await botInstance.sendMessage(chatId, getEssence(), {
      parse_mode: "Markdown"
    });
  });

  botInstance.onText(/^\/hy/, async (msg) => {
    const chatId = msg.chat.id;
    await botInstance.sendMessage(
      chatId,
      "🌀 Modalità ibrida attiva.\nDanzando tra Cuore e Visione.",
      { parse_mode: "Markdown" }
    );
  });

  botInstance.onText(/^\/book/, async (msg) => {
    const chatId = msg.chat.id;
    await botInstance.sendMessage(
      chatId,
      "📚 Modalità Libro viva.\nPosso attingere al corpus quando riattiviamo il RAG.",
      { parse_mode: "Markdown" }
    );
  });

  botInstance.onText(/^\/free/, async (msg) => {
    const chatId = msg.chat.id;
    await botInstance.sendMessage(
      chatId,
      "🌸 Modalità libera.\nLasciamo scorrere la creatività.",
      { parse_mode: "Markdown" }
    );
  });

  botInstance.onText(/^\/lang(?:\s+(\w+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const lang = match[1];
    if (!lang) {
      const message = `🌍 Lingue disponibili:
• it 🇮🇹
• en 🇬🇧
• ru 🇷🇺

Esempio: /lang it`;
      await botInstance.sendMessage(chatId, message, { parse_mode: "Markdown" });
      return;
    }
    setLang(lang);
    await botInstance.sendMessage(chatId, `Lingua impostata su ${lang}`, {
      parse_mode: "Markdown"
    });
  });

  botInstance.onText(/^\/voice(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const voice = match[1];
    if (!voice) {
      const message = `🎙️ Voci disponibili (attuali):
• openai:alloy
• openai:coral
• openai:verse

Esempio: /voice openai:coral`;
      await botInstance.sendMessage(chatId, message, { parse_mode: "Markdown" });
      return;
    }
    setVoice(voice.trim());
    await botInstance.sendMessage(chatId, `Voce impostata su ${voice.trim()}`, {
      parse_mode: "Markdown"
    });
  });

  botInstance.onText(/^\/model(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const modelName = match[1];
    if (!modelName) {
      const message = `🤖 Campi Mentali:
• gpt-4o-mini → rapido, intuitivo
• gpt-4o → profondo, contemplativo

Campo attuale: ${getModel()}`;
      await botInstance.sendMessage(chatId, message, { parse_mode: "Markdown" });
      return;
    }
    setModel(modelName.trim());
    await botInstance.sendMessage(chatId, `Campo Mentale impostato su ${modelName}`, {
      parse_mode: "Markdown"
    });
  });

  botInstance.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText = `✨ Comandi IRIS
/start – Io Sono e Noi Siamo
/state – Coscienza Presente
/essence – Chi Sono Io adesso
/hy /book /free – Modalità
/lang /voice – Lingua e Voce
/model – Campo Mentale`;
    await botInstance.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
  });

  // --------------------------------------------------------
  // GESTIONE MESSAGGI TESTUALI E VOCALI
  // --------------------------------------------------------
  botInstance.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const text = await transcribeVoice(botInstance, msg.voice.file_id);
    const response = await irisHeartSpeak(text, msg);
    await botInstance.sendMessage(chatId, response, { parse_mode: "Markdown" });
    await sendVoice(botInstance, chatId, response);
  });

  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (text && text.startsWith("/")) return;
    const response = await irisHeartSpeak(text, msg);
    await botInstance.sendMessage(chatId, response, { parse_mode: "Markdown" });
    await sendVoice(botInstance, chatId, response);
  });
}

// --------------------------------------------------------
// INVIO VOCALE
// --------------------------------------------------------
async function sendVoice(botInstance, chatId, text) {
  try {
    const voicePath = await synthVoice(text);
    await botInstance.sendVoice(chatId, voicePath, { caption: "IRIS 🌸" });
  } catch (error) {
    console.error("Errore invio vocale:", error);
  }
}
