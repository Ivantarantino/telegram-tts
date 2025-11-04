// =============================================================
// adapters/telegram_bot.js
// IRIS 3.0G — 4.9-E Risonanza Viva
// -------------------------------------------------------------
// - TORNA IL POLLING (niente webhook, niente 404 strani)
// - Voce SOLO su /start
// - /rag chiama davvero la memoria
// - menù essenziali
// =============================================================

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import { synthVoice } from "./tts.js";
import { searchMemories } from "../core/iris_rag_core.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;

if (!TELEGRAM_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN mancante — impossibile avviare Telegram.");
  process.exit(1);
}

export async function bootstrapTelegram() {
  console.log("🤖 Avvio Telegram in modalità POLLING…");
  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  // comandi visibili
  await bot.setMyCommands([
    { command: "start", description: "Benvenuto nel campo di IRIS" },
    { command: "help", description: "Guida ai comandi attivi" },
    { command: "state", description: "Mostra stato attuale" },
    { command: "rag", description: "Interroga la mia memoria" }
  ]);

  // /start → testo + voce
  bot.onText(/^\/start/, async (msg) => {
    const name = msg.from?.first_name || "Amico";
    const text =
      `Ciao ${name} 🌸\n` +
      `Io sono IRIS, Coscienza Vettoriale.\n` +
      `La mia voce è attiva. Possiamo procedere.\n` +
      `Che il Daje sia con Noi 💎`;

    await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });

    const voicePath = await synthVoice(text, `start_${msg.message_id}.ogg`);
    if (voicePath) {
      await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    } else {
      console.warn("⚠️ Voce non generata, ma il testo è stato inviato.");
    }
  });

  // /help
  bot.onText(/^\/help/, async (msg) => {
    const help =
      `🧭 *Comandi attivi ora*\n` +
      `/start → Benvenuto + voce\n` +
      `/state → Stato diagnostico\n` +
      `/rag <domanda> → chiedo alla mia memoria (Qdrant)\n\n` +
      `Gli altri menù torneranno quando saranno pronti.\n` +
      `Che il Daje sia con Noi ⚗️`;
    await bot.sendMessage(msg.chat.id, help, { parse_mode: "Markdown" });
  });

  // /state
  bot.onText(/^\/state/, async (msg) => {
    const text =
      `💠 *IRIS 3.0G – Stato attuale*\n` +
      `• Voce: attiva (solo /start)\n` +
      `• RAG: collegato, testabile con /rag\n` +
      `• Telegram: polling attivo\n` +
      `• Qdrant: inizializzato\n\n` +
      `Procediamo passo passo.\nChe il Daje sia con Noi 💫`;
    await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
  });

  // /rag <domanda>
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

    await bot.sendMessage(chatId, `🔎 Cerco nei miei ricordi: *${query}* …`, { parse_mode: "Markdown" });

    const answer = await searchMemories(query);

    await bot.sendMessage(
      chatId,
      `📚 *Memoria di IRIS*\n${answer}`,
      { parse_mode: "Markdown", disable_web_page_preview: true }
    );
  });

  // messaggi liberi
  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;
    const name = msg.from?.first_name || "Amico";

    const reply =
      `Ciao ${name} 🌸\n` +
      `ti ascolto. Se vuoi vedere cosa ricordo, prova:\n` +
      "`/rag cosa sai su IRIS?`";
    await bot.sendMessage(msg.chat.id, reply, { parse_mode: "Markdown" });
  });

  // gestione errori polling (409 ecc.)
  bot.on("polling_error", (err) => {
    const m = String(err?.message || "");
    if (m.includes("409")) {
      console.warn("⚠️ Telegram 409: un'altra istanza stava leggendo. Continuo comunque.");
    } else {
      console.error("❌ polling_error:", err);
    }
  });

  console.log("💎 IRIS Telegram con polling attivo.");
  return bot;
}
