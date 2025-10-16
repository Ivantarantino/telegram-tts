import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import textToSpeech from "@google-cloud/text-to-speech";
import { writeFile } from "fs/promises";
import { OpenAI } from "openai";

// === CONFIG ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 10000;

// === OPENAI INIT ===
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// === GOOGLE CLOUD TTS INIT ===
const client = new textToSpeech.TextToSpeechClient();

// === EXPRESS SERVER ===
const app = express();
app.use(express.json());

// === TELEGRAM BOT ===
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log("DEBUG: Bot Telegram inizializzato con polling.");

// === FUNZIONE TTS ===
async function generaAudio(testo) {
  const request = {
    input: { text: testo },
    voice: { languageCode: "it-IT", name: "it-IT-Wavenet-C" }, // Voce femminile
    audioConfig: { audioEncoding: "MP3" },
  };

  const [response] = await client.synthesizeSpeech(request);
  const outputFile = "./output.mp3";
  await writeFile(outputFile, response.audioContent, "binary");
  return outputFile;
}

// === FUNZIONE OPENAI ===
async function generaRisposta(testoUtente) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: testoUtente }],
  });
  return response.choices[0].message.content;
}

// === GESTIONE MESSAGGI TELEGRAM ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  console.log(`DEBUG: Messaggio ricevuto: ${text}`);

  try {
    // Step 1: genera risposta testuale
    const risposta = await generaRisposta(text);
    console.log("DEBUG: Risposta OpenAI ->", risposta);

    // Step 2: genera audio
    const audioFile = await generaAudio(risposta);

    // Step 3: invia audio su Telegram
    await bot.sendAudio(chatId, audioFile, {}, { filename: "risposta.mp3" });
  } catch (error) {
    console.error("ERRORE:", error);
    await bot.sendMessage(chatId, "⚠️ Errore durante l'elaborazione della risposta.");
  }
});

// === EXPRESS PORT ===
app.listen(PORT, () => {
  console.log(`Server attivo su porta ${PORT}`);
});
