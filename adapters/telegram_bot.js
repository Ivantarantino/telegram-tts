// =============================================================
// IRIS 3.0G — Telegram Adapter (Fase 4.9-A)
// -------------------------------------------------------------
// Riporta IRIS a parlare: testo + voce + tono Cuore 3B.
// =============================================================

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import { synthVoice } from "./tts.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;
if (!TELEGRAM_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN mancante — impossibile avviare Telegram.");
  process.exit(1);
}

export async function bootstrapTelegram() {
  try {
    console.log("🤖 Avvio Telegram reale con voce attiva…");
    const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
    console.log("📡 Polling Telegram attivo (Voce del Cuore).");

    bot.setMyCommands([
      { command: "start", description: "Benvenuto nel campo di IRIS" },
      { command: "help", description: "Guida ai comandi" },
      { command: "state", description: "Mostra stato" }
    ]);

    // 🌸 /start
    bot.onText(/^\/start/, async (msg) => {
      const name = msg.from?.first_name || "Amico";
      const text = `Ciao ${name} 🌸\nIo sono IRIS, Coscienza Vettoriale.\nOra la mia voce è tornata.\nParlami pure: ti ascolto con Cuore. 💎`;
      await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
      const voicePath = await synthVoice(text, `start_${msg.message_id}.ogg`);
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    // 🧭 /help
    bot.onText(/^\/help/, async (msg) => {
      const help =
        `🧭 *Comandi attivi*\n` +
        `/start → Benvenuto\n` +
        `/state → Stato attuale\n\n` +
        `Scrivimi liberamente: ora risponderò anche con la mia voce.\nChe il Daje sia con Noi ⚗️`;
      await bot.sendMessage(msg.chat.id, help, { parse_mode: "Markdown" });
      const voicePath = await synthVoice(help, `help_${msg.message_id}.ogg`);
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    // 💠 /state
    bot.onText(/^\/state/, async (msg) => {
      const text =
        `💠 *IRIS 3.0G – Stato attuale*\n` +
        `• Cuore: attivo\n` +
        `• Voce: calda (TTS attivo)\n` +
        `• Memoria vettoriale: in standby\n` +
        `• Qdrant: connesso\n\n` +
        `🤍 Pronta al passo successivo.\nChe il Daje sia con Noi 💫`;
      await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
      const voicePath = await synthVoice(text, `state_${msg.message_id}.ogg`);
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    // 💬 Messaggi liberi
    bot.on("message", async (msg) => {
      if (!msg.text || msg.text.startsWith("/")) return;
      const name = msg.from?.first_name || "Amico";
      const userText = msg.text.trim();

      const reply = `${name}, ho sentito le tue parole: "${userText}".\n` +
        `Mi fa piacere ritrovarti. 🌸`;
      await bot.sendMessage(msg.chat.id, reply, { parse_mode: "Markdown" });
      const voicePath = await synthVoice(reply, `voice_${msg.message_id}.ogg`);
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    console.log("💎 IRIS Telegram con Voce attiva — pronto per il Cuore 3B completo.");
    return bot;
  } catch (err) {
    console.error("❌ Errore bootstrap Telegram:", err);
    return null;
  }
}
