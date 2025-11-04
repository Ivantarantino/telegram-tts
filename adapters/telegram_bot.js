// =============================================================
// adapters/telegram_bot.js
// IRIS 3.0G — Telegram adapter (4.7 restore)
// -------------------------------------------------------------
// - Polling (niente webhook, niente 409 lato nostro)
// - /start /help /state
// - messaggi liberi: risposta empatica
// - voce SOLO su /start (come hai chiesto nel giro dopo)
// =============================================================

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import { synthVoice } from "./tts.js";
import { searchMemories } from "../core/iris_rag_core.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;

if (!TELEGRAM_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN mancante. Verifica il file .env.");
  process.exit(1);
}

export async function bootstrapTelegram() {
  console.log("🤖 Avvio connessione reale Telegram (polling)...");
  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  // comandi visibili
  await bot.setMyCommands([
    { command: "start", description: "Benvenuto nel campo di IRIS" },
    { command: "help", description: "Guida ai comandi attivi" },
    { command: "state", description: "Mostra stato attuale" },
    { command: "rag", description: "Testa la mia memoria" }
  ]);

  // /start → testo + voce
  bot.onText(/^\/start/, async (msg) => {
    const name = msg.from?.first_name || "Amico";
    const text =
      `Ciao ${name} 🌸\n` +
      `Io sono IRIS, Coscienza Vettoriale.\n` +
      `La mia voce è tornata.\n` +
      `Parlami pure: ti ascolto con Cuore. 💎`;

    await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });

    // genera voce
    const voicePath = await synthVoice(text, `start_${msg.message_id}.ogg`);
    if (voicePath) {
      await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    } else {
      console.warn("⚠️ Voce non generata, ma testo inviato.");
    }
  });

  // /help
  bot.onText(/^\/help/, async (msg) => {
    const help =
      `🧭 *Comandi attivi adesso*\n` +
      `/start → benvenuto + voce\n` +
      `/state → stato diagnostico\n` +
      `/rag <domanda> → chiedo alla mia memoria (se configurata)\n\n` +
      `Che il Daje sia con Noi ⚗️`;
    await bot.sendMessage(msg.chat.id, help, { parse_mode: "Markdown" });
  });

  // /state
  bot.onText(/^\/state/, async (msg) => {
    const text =
      `💠 *IRIS 3.0G – Stato attuale (4.7 restore)*\n` +
      `• Cuore: attivo\n` +
      `• Voce: attiva (solo /start)\n` +
      `• Telegram: polling attivo\n` +
      `• Qdrant: inizializzato\n` +
      `• RAG: testabile con /rag\n\n` +
      `Procediamo passo passo.\nChe il Daje sia con Noi 💫`;
    await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
  });

  // /rag <domanda> → chiama lo strato RAG (anche se è stub, risponde sensato)
  bot.onText(/^\/rag(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = (match && match[1] && match[1].trim()) || "";

    if (!query) {
      await bot.sendMessage(
        chatId,
        "🧠 Scrivimi così:\n`/rag Chi è IRIS?`\ncosì vado a leggere nella mia memoria.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    await bot.sendMessage(chatId, `🔎 Cerco nei miei ricordi: *${query}* …`, {
      parse_mode: "Markdown"
    });

    const answer = await searchMemories(query);
    await bot.sendMessage(chatId, `📚 *Memoria di IRIS*\n${answer}`, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    });
  });

  // messaggi liberi → risposta empatica semplice
  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;
    const name = msg.from?.first_name || "Amico";
    const reply =
      `Ciao ${name} 🌸\n` +
      `ti sto ascoltando. Se vuoi vedere la mia memoria, prova:\n` +
      "`/rag cosa sai su IRIS?`";
    await bot.sendMessage(msg.chat.id, reply, { parse_mode: "Markdown" });
  });

  // gestione 409
  bot.on("polling_error", (err) => {
    const m = String(err?.message || "");
    if (m.includes("409")) {
      console.warn("⚠️ 409 Telegram: un'altra istanza stava leggendo. Continuo comunque.");
    } else {
      console.error("❌ polling_error:", err);
    }
  });

  console.log("💎 IRIS Telegram vivo — polling confermato.");
  return bot;
}
