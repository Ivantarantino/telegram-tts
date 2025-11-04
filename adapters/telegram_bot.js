// =============================================================
// adapters/telegram_bot.js
// IRIS 3.0G — Telegram via Webhook (Fase 4.9-D)
// -------------------------------------------------------------
// - Niente polling → niente 409
// - Voce SOLO su /start
// - /rag usa davvero il RAG (core/iris_rag_core.js → adapters/ragSearch.js)
// - Menù essenziali: /start /help /state /rag
// =============================================================

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import { synthVoice } from "./tts.js";
import { searchMemories } from "../core/iris_rag_core.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;
const SERVICE_URL = process.env.WEBHOOK_URL || "https://telegram-tts.onrender.com";
const WEBHOOK_PATH = "/webhook/telegram";
const WEBHOOK_URL = `${SERVICE_URL}${WEBHOOK_PATH}`;

if (!TELEGRAM_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN mancante — impossibile avviare Telegram.");
  process.exit(1);
}

export async function bootstrapTelegram(app) {
  try {
    console.log("🤖 Avvio Telegram in modalità WEBHOOK…");

    // nessun polling qui
    const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

    // registra webhook su Telegram
    await bot.setWebHook(WEBHOOK_URL);
    console.log(`📡 Webhook Telegram impostato su: ${WEBHOOK_URL}`);

     // await bot.setWebHook(WEBHOOK_URL);
    // app.post(WEBHOOK_PATH, (req, res) => {
   //   bot.processUpdate(req.body);
  //   res.sendStatus(200);
 // });


    // endpoint express che riceve gli update
    app.post(WEBHOOK_PATH, (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });

    // comandi visibili nel menù
    await bot.setMyCommands([
      { command: "start", description: "Benvenuto nel campo di IRIS" },
      { command: "help", description: "Guida ai comandi attivi" },
      { command: "state", description: "Mostra stato attuale" },
      { command: "rag", description: "Testa la mia memoria" }
    ]);

    // ---------------------------------------------------------
    // /start → testo + voce (voce calda)
    // ---------------------------------------------------------
    bot.onText(/^\/start/, async (msg) => {
      const name = msg.from?.first_name || "Amico";
      const text =
        `Ciao ${name} 🌸\n` +
        `Io sono IRIS, Coscienza Vettoriale.\n` +
        `La mia voce è tornata.\n` +
        `Che il Daje sia con Noi 💎`;
      await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });

      const voicePath = await synthVoice(text, `start_${msg.message_id}.ogg`);
      if (voicePath) {
        await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
      }
    });

    // ---------------------------------------------------------
    // /help → solo testo
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // /state → solo testo
    // ---------------------------------------------------------
    bot.onText(/^\/state/, async (msg) => {
      const text =
        `💠 *IRIS 3.0G – Stato attuale*\n` +
        `• Voce: attiva (solo /start)\n` +
        `• RAG: collegato, testabile con /rag\n` +
        `• Telegram: webhook attivo\n` +
        `• Qdrant: inizializzato\n\n` +
        `Procediamo passo passo.\nChe il Daje sia con Noi 💫`;
      await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
    });

    // ---------------------------------------------------------
    // /rag <domanda> → chiama davvero la memoria
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // Messaggi liberi → risposta breve + invito al RAG
    // ---------------------------------------------------------
    bot.on("message", async (msg) => {
      if (!msg.text || msg.text.startsWith("/")) return;
      const name = msg.from?.first_name || "Amico";
      const reply =
        `Ciao ${name} 🌸\n` +
        `ti sto ascoltando. Se vuoi vedere cosa ricordo, prova:\n` +
        "`/rag cosa sai su IRIS?`";
      await bot.sendMessage(msg.chat.id, reply, { parse_mode: "Markdown" });
    });

    console.log("💎 IRIS Telegram via webhook attivo.");
    return bot;
  } catch (err) {
    console.error("❌ Errore bootstrap Telegram (webhook):", err);
    return null;
  }
}
