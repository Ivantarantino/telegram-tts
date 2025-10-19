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
import { answerWithRAG } from "./ragSearch.js";

// ✅ Caricamento variabili ambiente
dotenv.config();

// ✅ Inizializzazione bot Telegram
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// ✅ Inizializzazione OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Inizializzazione Google TTS
const client = new textToSpeech.TextToSpeechClient();

// Funzione per generare audio da testo
async function synthesizeSpeech(text, chatId) {
  try {
    const request = {
      input: { text },
      voice: { languageCode: "it-IT", name: "it-IT-Wavenet-D" },
      audioConfig: { audioEncoding: "MP3" },
    };

    const [response] = await client.synthesizeSpeech(request);
    const filePath = path.resolve(`tts_${chatId}.mp3`);
    await fs.promises.writeFile(filePath, response.audioContent, "binary");
    console.log(`🔊 Audio salvato: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error("❌ Errore durante la sintesi vocale:", err);
    return null;
  }
}

// Gestione messaggi di testo
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Se arriva un vocale
  if (msg.voice) {
    await bot.sendMessage(chatId, "🎧 Sto elaborando il tuo messaggio vocale...");
    // 👉 Qui potremo aggiungere la trascrizione con Whisper
    return;
  }

  // Se arriva testo
  if (msg.text) {
    const question = msg.text.trim();
    console.log(`🧠 Domanda ricevuta: ${question}`);

    await bot.sendMessage(chatId, "🔍 Elaborazione in corso...");

    try {
      const answer = await answerWithRAG(question, "it");
      if (!answer || answer.trim().length === 0) {
        await bot.sendMessage(chatId, "❌ Non ho trovato informazioni utili nei documenti.");
        return;
      }

      await bot.sendMessage(chatId, `🧠 IRIS:\n\n${answer}`);

      // Genera voce
      const audioFile = await synthesizeSpeech(answer, chatId);
      if (audioFile) {
        await bot.sendAudio(chatId, audioFile);
        await fs.promises.unlink(audioFile); // Rimuove file dopo l’invio
      }
    } catch (err) {
      console.error("❌ Errore durante l'elaborazione:", err);
      await bot.sendMessage(chatId, "⚠️ Si è verificato un errore interno.");
    }
  }
});

console.log("🚀 IRIS 2.0 è attiva e in ascolto su Telegram!");
