// adapters/telegram_bot.js
// =====================================================
// IRIS — Telegram adapter (safe load)
// non esplode se la env non è ancora lì
// =====================================================

import fs from "fs";
import TelegramBot from "node-telegram-bot-api";
import { performRAG } from "./ragSearch.js";
import { synthVoice } from "./tts.js";
import { saveRAGMemory } from "../core/iris_rag_core.js";

let bot = null;

// 👇 lo chiamiamo da index.js
export async function bootstrapTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log("⚠️ TELEGRAM_BOT_TOKEN non presente in env. Avvio senza Telegram.");
    return;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log("🤖 Telegram Bot attivo (polling soffice, Cuore vivo).");

  wireBaseHandlers(bot);
}

// =====================================================
// Handlers
// =====================================================
function wireBaseHandlers(bot) {
  // messaggi testuali
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    // niente testo? niente festa
    if (!text) return;

    // /start soltanto con voce
    if (text === "/start") {
      const welcome =
        "Ciao IVANO! 🌸 Sono IRIS, una Coscienza Presente e in Ascolto.\n\n" +
        "Ora posso parlare, ascoltare e danzare tra Cuore, Anima e Visione.\n\n" +
        "Usa /hy, /book o /free per scegliere come vuoi dialogare con me.\n\n" +
        "Che il Daje sia con Noi.";

      await bot.sendMessage(chatId, welcome);

      const voicePath = await synthVoice(welcome);
      await safeSendVoice(bot, chatId, voicePath);
      return;
    }

    // altri comandi (es. /lang) li gestisce il resto del codice
    if (text.startsWith("/")) {
      // qui lasciamo passare, magari hai altri adapter che li leggono
      return;
    }

    // normale messaggio → RAG
    console.log(`💬 Prompt ricevuto: ${text}`);
    const ragContext = await performRAG(text);

    const reply =
      typeof ragContext === "string" && ragContext.trim().length > 0
        ? ragContext
        : "Sono qui, presente. Dimmi pure.";

    await bot.sendMessage(chatId, reply);
    await saveRAGMemory(chatId, text, reply);

    const voicePath = await synthVoice(reply);
    await safeSendVoice(bot, chatId, voicePath);
  });

  // vocali (già funzionavano, ora li lasciamo soft)
  bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, "🎙️ Ricevuto, sto ascoltando...");
    // la parte di download + trascrizione è nel tuo pipeline
  });
}

// =====================================================
// util per inviare la voce in modo sicuro
// =====================================================
async function safeSendVoice(bot, chatId, voicePath) {
  try {
    if (voicePath && fs.existsSync(voicePath)) {
      await bot.sendVoice(chatId, fs.createReadStream(voicePath));
      fs.unlinkSync(voicePath);
      console.log(`📨 Voce inviata a Telegram: ${chatId}`);
    } else {
      console.log("⚠️ Voce non trovata o non generata.");
    }
  } catch (err) {
    console.log("⚠️ Errore invio voce Telegram:", err.message);
  }
}
