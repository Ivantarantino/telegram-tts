// =============================
// 🤖 IRIS Telegram Bot - index.js
// =============================

import fs from "fs";
import fetch from "node-fetch";
import express from "express";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import { answerWithRAG } from "./ragSearch.js";
import { generateVoice } from "./tts.js"; // se hai la funzione TTS in un file separato
import { detectLanguage } from "./utils.js"; // opzionale, se hai il rilevamento lingua

dotenv.config();

// === Variabili ambiente ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// === Inizializza servizi ===
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const app = express();

console.log("🚀 IRIS è online e pronta all’ascolto!");

// =============================
// 🔹 GESTIONE MESSAGGI TESTUALI
// =============================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  // Se messaggio è un comando, ignoriamo qui
  if (text.startsWith("/")) return;

  try {
    bot.sendChatAction(chatId, "typing");
    console.log(`💬 Messaggio ricevuto: ${text}`);

    // Risposta via RAG
    const risposta = await answerWithRAG(text, "it");
    await bot.sendMessage(chatId, risposta);

  } catch (err) {
    console.error("❌ Errore messaggio:", err);
    await bot.sendMessage(chatId, "⚠️ Errore nell'elaborazione del messaggio.");
  }
});

// =============================
// 🎙️ GESTIONE VOCALI (NUOVO BLOCCO)
// =============================
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.voice.file_id;

  try {
    bot.sendChatAction(chatId, "typing");
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;

    console.log(`🎧 Ricevuto vocale da ${msg.from?.username || msg.from?.first_name}`);

    // Scarica file vocale
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Trascrizione con Whisper
    const transcript = await openai.audio.transcriptions.create({
      file: buffer,
      model: "whisper-1",
      response_format: "text",
    });

    const trascritto = transcript.trim();
    console.log(`🗣️ Trascrizione: ${trascritto}`);
    await bot.sendMessage(chatId, `🗣️ *Trascrizione*: ${trascritto}`, { parse_mode: "Markdown" });

    // Risposta RAG
    const risposta = await answerWithRAG(trascritto, "it");
    await bot.sendMessage(chatId, risposta);

    // Risposta vocale (opzionale, se hai il TTS attivo)
    if (generateVoice) {
      const audioPath = await generateVoice(risposta, "it");
      await bot.sendVoice(chatId, fs.createReadStream(audioPath));
    }

  } catch (err) {
    console.error("❌ Errore vocale:", err);
    bot.sendMessage(chatId, "⚠️ Errore durante la trascrizione o risposta vocale.");
  }
});

// =============================
// 🧩 COMANDI BASE
// =============================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🌸 Benvenuto! Sono IRIS. Inviami un messaggio o un vocale.");
});

bot.onText(/\/stato/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🟢 IRIS è attiva e in ascolto!");
});

bot.onText(/\/chiedi (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const domanda = match[1];

  try {
    bot.sendChatAction(chatId, "typing");
    const risposta = await answerWithRAG(domanda, "it");
    await bot.sendMessage(chatId, risposta);
  } catch (err) {
    console.error("❌ Errore /chiedi:", err);
    bot.sendMessage(chatId, "⚠️ Errore durante la richiesta.");
  }
});

// =============================
// 🌐 SERVER EXPRESS (Render / Uptime)
// =============================
app.get("/", (req, res) => {
  res.send("✅ IRIS Telegram Bot attivo e funzionante!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[IRIS] Server Express attivo sulla porta ${PORT}`);
});
