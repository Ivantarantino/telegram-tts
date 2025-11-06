// =====================================================
// adapters/telegram_bot.js — IRIS 3.0C · Build 4.9.2
// =====================================================

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import { handleRAG } from "./ragSearch.js";
import { textToSpeech } from "./tts.js"; // 🔥 ripristinato come nella 4.9.2

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("❌ TELEGRAM_BOT_TOKEN non definito in .env");

export const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// =====================================================
// 🧠 Gestione messaggi testuali
// =====================================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text) return;

  console.log(`💬 Prompt ricevuto: ${text}`);

  try {
    // 🔍 Esecuzione RAG con salvataggio memoria
    const answer = await handleRAG(chatId, text);

    // 🔊 Generazione vocale (usa tts.js)
    const voiceFile = await textToSpeech(answer);
    if (voiceFile) {
      await bot.sendVoice(chatId, voiceFile);
      fs.unlinkSync(voiceFile);
    }

    // ✍️ Risposta testuale
    await bot.sendMessage(chatId, answer);
  } catch (error) {
    console.error("❌ Errore nella gestione del messaggio:", error.message);
    await bot.sendMessage(chatId, "Mi sento confusa... puoi ripetere?");
  }
});

console.log("🤖 Telegram Bot attivo (polling soffice, Cuore vivo).");
