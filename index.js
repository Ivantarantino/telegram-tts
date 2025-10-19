// ============================================================
// 🤖 IRIS 2.0 — Bot Telegram con RAG + Voce Google TTS
// ============================================================

import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import fs from "fs";
import util from "util";
import path from "path";
import dotenv from "dotenv";
import express from "express";
import textToSpeech from "@google-cloud/text-to-speech";
import { answerWithRAG } from "./ragSearch.js"; // 🌺 Motore RAG

dotenv.config();

// ============================================================
// ⚙️ CONFIGURAZIONE
// ============================================================

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ttsClient = new textToSpeech.TextToSpeechClient();
const app = express();

const writeFile = util.promisify(fs.writeFile);
const linguaTTS = "it-IT";
const voceTTS = "B"; // Voce maschile Google Cloud

// ============================================================
// 🧩 FUNZIONE PRINCIPALE IRIS
// ============================================================

async function askIRIS(query) {
  return await answerWithRAG(query);
}

// ============================================================
// 🎙️ Funzione per generare risposta vocale
// ============================================================

async function generaAudio(testo, chatId) {
  try {
    const richiesta = {
      input: { text: testo },
      voice: { languageCode: linguaTTS, name: `it-IT-Wavenet-${voceTTS}` },
      audioConfig: { audioEncoding: "MP3" },
    };

    const [response] = await ttsClient.synthesizeSpeech(richiesta);
    const audioPath = path.join(`./tts_${chatId}.mp3`);
    await writeFile(audioPath, response.audioContent, "binary");

    await bot.sendAudio(chatId, audioPath);
    fs.unlinkSync(audioPath);
  } catch (err) {
    console.error("❌ Errore TTS:", err.message);
    await bot.sendMessage(chatId, "⚠️ Errore nella generazione vocale.");
  }
}

// ============================================================
// 💬 GESTIONE MESSAGGI
// ============================================================

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const testo = msg.text?.trim();

  if (!testo) return;

  console.log(`💭 Messaggio da ${msg.from.first_name}: ${testo}`);

  // Comando /start
  if (testo === "/start") {
    await bot.sendMessage(chatId, "🌸 Benvenuto, sono IRIS 2.0. Dimmi pure cosa vuoi esplorare.");
    return;
  }

  // Altri messaggi → RAG
  const risposta = await askIRIS(testo);
  await bot.sendMessage(chatId, risposta);
  await generaAudio(risposta, chatId);
});

// ============================================================
// 🌐 SERVER HTTP per Render e UptimeRobot
// ============================================================

app.get("/", (req, res) => {
  res.send("🤖 IRIS 2.0 è attiva e operativa su Render!");
});

app.get("/ping", (req, res) => {
  res.json({ status: "ok", uptime: "active", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌐 Server HTTP attivo sulla porta ${PORT}`);
});

// ============================================================
// 🔁 AUTO-PING INTERNO (Mantiene vivo Render)
// ============================================================

setInterval(() => {
  fetch("https://telegram-tts.onrender.com/ping")
    .then(() => console.log("🔁 Ping automatico a Render per mantenere IRIS attiva"))
    .catch(() => console.warn("⚠️ Ping fallito, Render potrebbe essere temporaneamente lento"));
}, 600000); // ogni 10 minuti

// ============================================================
// 🚀 AVVIO COMPLETATO
// ============================================================

console.log("🤖 IRIS 2.0 avviato e in ascolto su Telegram...");
