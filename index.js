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
import { answerWithRAG } from "./ragSearch.js"; // 🧠 Modulo RAG
import express from "express";

dotenv.config();

// ✅ CONFIGURAZIONE
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new textToSpeech.TextToSpeechClient();

// =======================================================
// 🎙️ Funzione per generare audio TTS (Google)
// =======================================================
async function generaAudio(text, chatId) {
  try {
    console.log(`🗣️ Generazione audio per: ${text}`);
    const request = {
      input: { text },
      voice: { languageCode: "it-IT", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3" },
    };
    const [response] = await client.synthesizeSpeech(request);
    const filePath = path.resolve(`./voice_${chatId}.mp3`);
    await util.promisify(fs.writeFile)(filePath, response.audioContent, "binary");
    console.log("✅ Audio generato:", filePath);
    return filePath;
  } catch (error) {
    console.error("❌ Errore durante la generazione TTS:", error);
    throw error;
  }
}

// =======================================================
// 💬 Gestione messaggi Telegram
// =======================================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text?.trim();

  if (!userText) return;

  console.log(`💬 Messaggio da ${msg.chat.username || chatId}: ${userText}`);

  try {
    // Risposta tramite RAG
    const risposta = await answerWithRAG(userText);
    await bot.sendMessage(chatId, `🧠 ${risposta}`);

    // Genera audio e invialo
    const audioPath = await generaAudio(risposta, chatId);
    await bot.sendAudio(chatId, audioPath);

    fs.unlinkSync(audioPath); // elimina file temporaneo
  } catch (error) {
    console.error("❌ Errore:", error);
    await bot.sendMessage(chatId, "⚠️ Si è verificato un errore interno. Riprova più tardi.");
  }
});

// =======================================================
// 🌐 KEEP-ALIVE SERVER per Render
// =======================================================
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("🤖 IRIS 2.0 è attiva e operativa su Render!");
});

app.listen(PORT, () => {
  console.log(`🌐 Server HTTP attivo sulla porta ${PORT}`);
});

// =======================================================
// 🟢 AVVIO COMPLETATO
// =======================================================
console.log("🤖 IRIS 2.0 avviato e in ascolto su Telegram...");
