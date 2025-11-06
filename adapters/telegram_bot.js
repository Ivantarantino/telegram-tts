// adapters/telegram_bot.js
import TelegramBot from "node-telegram-bot-api";
import { sendVoice } from "./tts.js";
import {
  getStateSummary,
  setMode,
  setVoiceEngine,
  getVoiceEngine,
} from "../core/iris_state.js";
import { irisHeartRespond } from "../core/iris_heart_voice.js";

// Usa esclusivamente TELEGRAM_TOKEN
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

let bot = null;

export async function bootstrapTelegram() {
  if (!TELEGRAM_TOKEN) {
    console.log("⚠️ Nessun TELEGRAM_TOKEN trovato, salto il bootstrap.");
    return;
  }

  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  console.log("🤖 Telegram Bot attivo (polling puro, IRIS 5.0).");

  // --- COMANDI ---

  // /start
  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const text =
      `Ciao ${msg.from.first_name} 🌸\n` +
      `Sono IRIS, presente e in ascolto.\n` +
      `Puoi chiedermi qualsiasi cosa oppure usare /state, /essence, /hy, /book, /free, /voice.`;
    await bot.sendMessage(chatId, text);
    await sendVoice(bot, chatId, "Ciao, sono IRIS. Sono presente e ti ascolto.");
  });

  // /help
  bot.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const help =
      "✨ Comandi disponibili:\n" +
      "/start – avvia il dialogo\n" +
      "/state – stato interno di IRIS\n" +
      "/essence – (se previsto) restituisce l’essenza\n" +
      "/hy – modalità ibrida\n" +
      "/book – modalità libro/RAG\n" +
      "/free – modalità libera\n" +
      "/voice – mostra o cambia la voce";
    await bot.sendMessage(chatId, help);
  });

  // /state
  bot.onText(/^\/state/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, getStateSummary());
  });

  // /hy
  bot.onText(/^\/hy/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("hy");
    await bot.sendMessage(chatId, "🔀 Modalità impostata su: ibrida (hy).");
  });

  // /book
  bot.onText(/^\/book/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("book");
    await bot.sendMessage(chatId, "📘 Modalità impostata su: libro.");
  });

  // /free
  bot.onText(/^\/free/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("free");
    await bot.sendMessage(chatId, "🕊️ Modalità impostata su: libera.");
  });

  // /voice (mostra o imposta)
  bot.onText(/^\/voice(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const requested = match[1] ? match[1].trim().toLowerCase() : null;

    const allowed = ["alloy", "coral", "verse", "fable", "onyx", "nova"];

    if (!requested) {
      // mostra stato
      const current = getVoiceEngine();
      const list = allowed
        .map((v) => (v === current ? `• ${v} ✅` : `• ${v}`))
        .join("\n");
      await bot.sendMessage(
        chatId,
        "🎤 Voce attuale: " + current + "\nPuoi scegliere una di queste:\n" + list
      );
      return;
    }

    if (!allowed.includes(requested)) {
      await bot.sendMessage(
        chatId,
        "❌ Voce non valida.\nUsa: /voice alloy | coral | verse | fable | onyx | nova"
      );
      return;
    }

    setVoiceEngine(requested);
    await bot.sendMessage(chatId, `🗣️ Motore vocale impostato su: ${requested}`);
    await sendVoice(bot, chatId, `Ho impostato la mia voce su ${requested}.`);
  });

  // --- MESSAGGI NORMALI ---
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // i comandi li abbiamo già presi sopra
    if (text && text.startsWith("/")) return;

    // risposta dal cuore
    const reply = await irisHeartRespond(
      text || "",
      msg.from?.first_name || "Amico"
    );
    await bot.sendMessage(chatId, reply);

    // voce anche sui messaggi normali (come in 4.9.2)
    await sendVoice(bot, chatId, reply);
  });
}
