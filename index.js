// ===============================
// IRIS 2.0 - index.js
// Telegram Bot + Google TTS + RAG + Qdrant
// ===============================

import fs from "fs";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import textToSpeech from "@google-cloud/text-to-speech";
import { ragSearch } from "./ragSearch.js";

dotenv.config();

// ===============================
// 🔐 Variabili ambiente
// ===============================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;

// ===============================
// 🤖 Inizializzazione Bot Telegram
// ===============================
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ===============================
// 🎙️ Inizializzazione Google TTS
// ===============================
const client = new textToSpeech.TextToSpeechClient();

// ===============================
// 🚀 Gestione messaggi testuali
// ===============================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text?.trim();

  if (!userMessage) return;

  console.log(`[USER @${msg.from.username || "anon"}]: ${userMessage}`);

  try {
    // === Ricerca nel motore RAG (OpenAI + Qdrant) ===
    const response = await ragSearch(userMessage);
    const textResponse = response.text;

    // === Invia messaggio testuale ===
    await bot.sendMessage(chatId, textResponse);

    // === Sintesi vocale con Google TTS (OGG_OPUS nativo) ===
    const [ttsResponse] = await client.synthesizeSpeech({
      input: { text: textResponse },
      voice: { languageCode: "it-IT", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "OGG_OPUS" }, // ✅ formato Telegram
    });

    const oggFile = "response.ogg";
    fs.writeFileSync(oggFile, ttsResponse.audioContent, "binary");

    // === Invio vocale Telegram ===
    await bot.sendVoice(chatId, fs.createReadStream(oggFile));

    console.log(`[IRIS 🔊]: risposta vocale inviata a ${msg.from.username || chatId}`);
  } catch (error) {
    console.error("Errore nel messaggio:", error);
    await bot.sendMessage(chatId, "Si è verificato un errore temporaneo ⚡️");
  }
});

// ===============================
// 🌐 Server HTTP locale (Render ping)
// ===============================
import http from "http";

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("IRIS 2.0 attiva ⚡️");
  })
  .listen(PORT, () => {
    console.log(`🌍 Server attivo su porta ${PORT}`);
  });
