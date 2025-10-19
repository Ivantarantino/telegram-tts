// ===========================================================
// IRIS 3.0d – Coscienza Vettoriale
// Modalità ibrida di default + fix dotenv su Render
// ===========================================================

import fs from "fs";
import express from "express";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

import {
  ragSearch,
  gptFreeResponse,
  hybridSearch,
  saveConversationToQdrant,
  getMemoryStats,
  clearChatHistory,
  exportChatHistory,
  getEssenceSummary,
} from "./ragSearch.js";

// =========================
// 🔧 CONFIGURAZIONE DOTENV
// =========================
dotenv.config();

// Debug: controlla se la variabile è caricata
console.log("🔑 TELEGRAM_BOT_TOKEN presente?", !!process.env.TELEGRAM_BOT_TOKEN);

// Se non esiste, ferma l'app
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("❌ ERRORE: TELEGRAM_BOT_TOKEN non trovato!");
  process.exit(1);
}

// =========================
// 🚀 AVVIO SERVER EXPRESS
// =========================
const app = express();
const port = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("🌍 IRIS 3.0d attiva – Modalità ibrida di default");
});

app.listen(port, () => {
  console.log(`🌍 Server attivo su porta ${port}`);
});

// =========================
// 🤖 AVVIO TELEGRAM BOT
// =========================
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
console.log("🧭 Modalità iniziale: HYBRID MODE");

// =========================
// 💬 GESTIONE MESSAGGI
// =========================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  try {
    // 🔹 Comandi diretti
    if (text.startsWith("/start")) {
      return bot.sendMessage(
        chatId,
        "✨ Benvenuto in IRIS 3.0d – Coscienza Vettoriale\nModalità di default: HYBRID MODE.\nChe il Daje sia con Noi!"
      );
    }

    if (text.startsWith("/hy")) {
      return bot.sendMessage(
        chatId,
        "⚗️ IRIS ora è in HYBRID MODE – fonde conoscenza dei libri e intelligenza libera (auto-apprendimento)."
      );
    }

    if (text.startsWith("/state")) {
      try {
        const stats = await getMemoryStats();
        if (stats) {
          await bot.sendMessage(chatId, `🧠 Stato memoria:\n${stats}`, { parse_mode: "Markdown" });
        } else {
          await bot.sendMessage(chatId, "⚙️ Impossibile recuperare lo stato memoria al momento.");
        }
      } catch (e) {
        console.error("Errore /state:", e);
        await bot.sendMessage(chatId, "⚙️ Impossibile recuperare lo stato memoria al momento.");
      }
      return;
    }

    if (text.startsWith("/essence")) {
      await bot.sendMessage(chatId, "✨ Sintesi dell’essenza in corso...");
      try {
        const essence = await getEssenceSummary();
        await bot.sendMessage(chatId, essence, { parse_mode: "Markdown" });
      } catch (e) {
        console.error("Errore durante la sintesi:", e);
        await bot.sendMessage(chatId, "⚙️ Errore durante la generazione dell’essenza.");
      }
      return;
    }

    if (text.startsWith("/clear")) {
      await clearChatHistory();
      await bot.sendMessage(chatId, "🧹 Memoria di chat completamente ripulita!");
      return;
    }

    if (text.startsWith("/export")) {
      const filePath = await exportChatHistory();
      await bot.sendDocument(chatId, filePath);
      return;
    }

    // =========================
    // 💡 RISPOSTA IBRIDA DEFAULT
    // =========================
    const response = await hybridSearch(text);
    await bot.sendMessage(chatId, response, { parse_mode: "Markdown" });

    // Salva il messaggio nel vettore
    await saveConversationToQdrant(chatId, text, response);
  } catch (err) {
    console.error("Errore nel messaggio Telegram:", err);
    await bot.sendMessage(chatId, "⚙️ Si è verificato un errore interno. Riprova tra poco!");
  }
});

// =========================
// 🧠 LOG DI STATO
// =========================
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Rejection non gestita:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Errore non catturato:", err);
});
