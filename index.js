// =======================================================
// 🤖 IRIS 2.0 — Bot Telegram con RAG + Voce Google TTS
// =======================================================

import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import fs from "fs";
import util from "util";
import path from "path";
import dotenv from "dotenv";
import textToSpeech from "@google-cloud/text-to-speech";
import { answerWithRAG } from "./ragSearch.js"; // 🧠 Modulo di risposta RAG

dotenv.config();

// ✅ CONFIGURAZIONE
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ CLIENT GOOGLE TTS
const ttsClient = new textToSpeech.TextToSpeechClient();

// 📂 Percorso temporaneo file audio
const TEMP_DIR = "./temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// 🔹 Funzione: genera voce da testo
async function generateVoice(text, filename = "output.mp3") {
  const outputPath = path.join(TEMP_DIR, filename);
  const request = {
    input: { text },
    voice: { languageCode: "it-IT", name: "it-IT-Wavenet-D" },
    audioConfig: { audioEncoding: "MP3" },
  };

  const [response] = await ttsClient.synthesizeSpeech(request);
  await util.promisify(fs.writeFile)(outputPath, response.audioContent, "binary");
  return outputPath;
}

// 🔹 Funzione: gestisce messaggi ricevuti
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  console.log(`📩 Messaggio ricevuto da ${msg.chat.username || "utente"}: ${text}`);

  // Se il messaggio inizia con /start
  if (text === "/start") {
    await bot.sendMessage(chatId, "✨ Benvenuto in IRIS 2.0 — la tua AI con memoria e voce.\nChe il Daje sia con Noi ⚡️");
    return;
  }

  try {
    // 🧠 Passaggio al motore RAG
    const risposta = await answerWithRAG(text);
    console.log("💬 Risposta generata:", risposta);

    // 🎧 Genera voce
    const audioPath = await generateVoice(risposta, `reply_${chatId}.mp3`);

    // 🎙 Invia voce + testo
    await bot.sendAudio(chatId, audioPath, {
      title: "Risposta vocale di IRIS",
      caption: risposta,
    });

    // Pulisce i file temporanei
    fs.unlinkSync(audioPath);
  } catch (err) {
    console.error("❌ Errore durante l'elaborazione:", err);
    await bot.sendMessage(chatId, "⚠️ Errore interno. Riprova tra poco.");
  }
});

console.log("🤖 IRIS 2.0 avviato e in ascolto su Telegram...");
