// adapters/telegram_bot.js
// =====================================================
// IRIS — Telegram adapter (usa TELEGRAM_TOKEN corretto)
// =====================================================

import fs from "fs";
import TelegramBot from "node-telegram-bot-api";
import { performRAG } from "./ragSearch.js";
import { synthVoice } from "./tts.js";
import { saveRAGMemory } from "../core/iris_rag_core.js";

let bot = null;

export async function bootstrapTelegram() {
  // 👇 nome corretto della variabile
  const token = process.env.TELEGRAM_TOKEN;

  if (!token) {
    console.log("❌ TELEGRAM_TOKEN non trovato in .env — impossibile avviare il bot Telegram.");
    return;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log("🤖 Telegram Bot attivo (polling soffice, Cuore vivo).");

  wireHandlers(bot);
}

// -----------------------------------------------------
// Handlers
// -----------------------------------------------------
function wireHandlers(bot) {
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text) return;

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

    if (text.startsWith("/")) return;

    console.log(`💬 Prompt ricevuto: ${text}`);
    const ragContext = await performRAG(text);

    const reply =
      typeof ragContext === "string" && ragContext.trim().length > 0
        ? ragContext
        : "Sono qui, presente e in ascolto. Dimmi pure.";

    await bot.sendMessage(chatId, reply);
    await saveRAGMemory(chatId, text, reply);

    const voicePath = await synthVoice(reply);
    await safeSendVoice(bot, chatId, voicePath);
  });

  bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, "🎙️ Ricevuto, sto ascoltando...");
  });
}

// -----------------------------------------------------
// util per inviare voce
// -----------------------------------------------------
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
