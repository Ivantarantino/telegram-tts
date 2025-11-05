// adapters/telegram_bot.js
// =====================================================
// IRIS 5.0.1 — Aggiunto comando /lang
// =====================================================

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { getEssence } from "../core/iris_essence_core.js";
import {
  getStateSummary,
  setMode,
  setVoiceEngine,
  setLang,
} from "../core/iris_state.js";
import { synthVoice } from "./tts.js";
import { transcribeVoice } from "./stt.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
let bot = null;

export async function bootstrapTelegram() {
  if (!TELEGRAM_TOKEN) {
    console.log("🔹 Nessun TELEGRAM_TOKEN trovato — Telegram non avviato.");
    return null;
  }

  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  console.log("🤖 Telegram Bot attivo (polling puro, IRIS 5.0.1).");

  await bot.setMyCommands([
    { command: "/start", description: "Ricomincia il dialogo con IRIS" },
    { command: "/essence", description: "Mostra l'Essenza attuale" },
    { command: "/state", description: "Mostra lo stato di IRIS" },
    { command: "/hy", description: "Modalità ibrida (Cuore + Visione)" },
    { command: "/book", description: "Modalità libro (solo conoscenza)" },
    { command: "/free", description: "Modalità libera (creativa)" },
    { command: "/voice", description: "Seleziona la voce di IRIS" },
    { command: "/lang", description: "Imposta la lingua di IRIS" },
    { command: "/help", description: "Guida e informazioni" },
  ]);

  // /lang — cambia lingua
  bot.onText(/\/lang(?:\s+(\w+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const arg = (match[1] || "").trim().toLowerCase();

    if (!arg) {
      await bot.sendMessage(
        chatId,
        "🌍 *Lingue disponibili:*\n- it 🇮🇹\n- en 🇬🇧\n- fr 🇫🇷\n- ru 🇷🇺\n\nUsa: /lang it (o altra lingua)",
        { parse_mode: "Markdown" }
      );
      return;
    }

    const ok = setLang(arg);
    if (ok) {
      const langNames = { it: "Italiano 🇮🇹", en: "English 🇬🇧", fr: "Français 🇫🇷", ru: "Русский 🇷🇺" };
      const name = langNames[arg] || arg;
      await bot.sendMessage(chatId, `✅ Lingua impostata su ${name}`);
    } else {
      await bot.sendMessage(chatId, "⚠️ Lingua non riconosciuta. Usa: /lang it|en|fr|ru");
    }
  });

  // ... (tutto il resto invariato come nella 5.0.0)
  // Hy, Book, Free, Help, Essence, Start, Voice, messaggi, voice handling, polling_error
}
