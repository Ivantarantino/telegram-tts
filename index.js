// ===============================
// IRIS 3.0d – index.js
// Coscienza Vettoriale + Markdown safe + Hybrid default
// ===============================

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import dotenv from "dotenv";
import express from "express";
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

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const app = express();

// -------------------------------
// Modalità e memoria volatile
// -------------------------------
let mode = "HYBRID"; // modalità di default
let shortTermMemory = []; // RAM temporanea (ultimi 10 messaggi)

// -------------------------------
// Server Express
// -------------------------------
app.get("/", (_, res) => res.send("IRIS è online 🌐"));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
});

// -------------------------------
// Utility
// -------------------------------

// pulisce markdown per Telegram
function safeMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/`/g, "\\`")
    .replace(/~/g, "\\~");
}

// invia messaggi vocali temporanei (ogg)
async function textToSpeech(replyText, chatId) {
  try {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`;
    const body = {
      input: { text: replyText },
      voice: { languageCode: "it-IT", name: "it-IT-Neural2-A" },
      audioConfig: { audioEncoding: "OGG_OPUS" },
    };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.audioContent) {
      const audioBuffer = Buffer.from(data.audioContent, "base64");
      const path = "./iris_reply.ogg";
      fs.writeFileSync(path, audioBuffer);
      await bot.sendVoice(chatId, path);
      fs.unlinkSync(path);
    }
  } catch (e) {
    console.error("Errore TTS:", e);
  }
}

// -------------------------------
// Modalità e comandi Telegram
// -------------------------------

// /mode → mostra modalità attuale
bot.onText(/^\/mode$/, async (msg) => {
  const chatId = msg.chat.id;
  const text =
    mode === "BOOK"
      ? "📚 BOOK MODE"
      : mode === "FREE"
      ? "🌀 FREE MODE"
      : "⚗️ HYBRID MODE";
  await bot.sendMessage(chatId, `Modalità corrente: ${text}`);
});

// /book
bot.onText(/^\/book$/, async (msg) => {
  mode = "BOOK";
  await bot.sendMessage(msg.chat.id, "📚 IRIS ora è in BOOK MODE");
});

// /free
bot.onText(/^\/free$/, async (msg) => {
  mode = "FREE";
  await bot.sendMessage(msg.chat.id, "🌀 IRIS ora è in FREE MODE");
});

// /hy
bot.onText(/^\/hy$/, async (msg) => {
  mode = "HYBRID";
  await bot.sendMessage(
    msg.chat.id,
    "⚗️ IRIS ora è in HYBRID MODE – fonde conoscenza dei libri e intelligenza libera (auto-apprendimento)."
  );
});

// /state
bot.onText(/^\/state$/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const stats = await getMemoryStats();
    const text =
      `🧠 *Stato Memoria*\n` +
      `• Modalità: ${mode}\n` +
      `• Memoria breve (RAM): ${shortTermMemory.length} interazioni\n` +
      `• Qdrant libri (${process.env.QDRANT_COLLECTION}): ~${stats.books} punti\n` +
      `• Qdrant chat (iris_chat_history): ~${stats.chat} punti\n` +
      (stats.note ? `\n${stats.note}` : "");
    await bot.sendMessage(chatId, safeMarkdown(text), {
      parse_mode: "MarkdownV2",
    });
  } catch (e) {
    console.error("Errore /state:", e);
    await bot.sendMessage(
      chatId,
      "⚙️ Impossibile recuperare lo stato memoria al momento."
    );
  }
});

// /clear
bot.onText(/^\/clear$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "🧹 Pulizia memoria in corso...");
  await clearChatHistory();
  await bot.sendMessage(chatId, "Memoria conversazionale cancellata ✅");
});

// /export
bot.onText(/^\/export$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "📦 Esporto memoria...");
  const path = await exportChatHistory();
  await bot.sendDocument(chatId, path);
});

// /essence
bot.onText(/^\/essence$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "✨ Sintesi dell’essenza in corso...");
  const essence = await getEssenceSummary();
  await bot.sendMessage(chatId, safeMarkdown(essence), {
    parse_mode: "MarkdownV2",
  });
});

// -------------------------------
// Gestione dei messaggi normali
// -------------------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text || text.startsWith("/")) return;

  console.log(`👤 Utente: ${text}`);

  let reply = "⚙️ C’è stato un piccolo problema. Riprova tra poco!";

  try {
    if (mode === "BOOK") {
      const res = await ragSearch(text);
      reply = res.text;
    } else if (mode === "FREE") {
      reply = await gptFreeResponse(text, shortTermMemory);
    } else {
      const res = await hybridSearch(text, shortTermMemory);
      reply = res.text;
    }

    // aggiorna memoria temporanea
    shortTermMemory.push({ role: "user", content: text });
    shortTermMemory.push({ role: "assistant", content: reply });
    if (shortTermMemory.length > 10) shortTermMemory = shortTermMemory.slice(-10);

    // salva in Qdrant
    await saveConversationToQdrant(text, reply, { mode });

    // invia risposta testuale
    await bot.sendMessage(chatId, safeMarkdown(reply), {
      parse_mode: "MarkdownV2",
    });

    // invia anche vocale
    await textToSpeech(reply, chatId);
  } catch (error) {
    console.error("Errore generale nel messaggio:", error);
    await bot.sendMessage(
      chatId,
      "⚙️ Si è verificato un errore interno, riprova tra poco."
    );
  }
});

console.log("🧭 Modalità iniziale: HYBRID MODE");
