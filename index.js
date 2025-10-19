// =======================================================
// 🤖 IRIS 2.0 — Bot Telegram con RAG + Voce Google TTS
// =======================================================
<<<<<<< HEAD

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
=======
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import fs from "fs";
import util from "util";
import path from "path";
import dotenv from "dotenv";
import textToSpeech from "@google-cloud/text-to-speech";
import { answerWithRAG } from "./ragSearch.js"; // 🧠 Import del modulo 


dotenv.config();

// ✅ CONFIGURAZIONE
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true 
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ttsClient = new textToSpeech.TextToSpeechClient();

let linguaTTS = "it-IT";
let voceTTS = "B";
const file = util.promisify(fs.writeFile);

// =======================================================
// 🧠 FUNZIONE IRIS CON RAG
// =======================================================
async function askIRIS(query) {
  try {
    console.log("🔍 Domanda:", query);
    const risposta = await answerWithRAG(query, "it"); // usa il RAG dal 
    import { answerWithRAG } from "./ragSearch.js";
    console.log("🧩 Risposta IRIS (RAG):", risposta);
    return risposta;
  } catch (err) {
    console.error("Errore in askIRIS:", err);
    return "⚠️ Errore durante la generazione della risposta.";
  }
}

// =======================================================
// 🔊 FUNZIONE GOOGLE TTS
// =======================================================
async function generaAudio(text, chatId) {
  const request = {
    input: { text },
    voice: { languageCode: linguaTTS, name: 
`${linguaTTS}-Wavenet-${voceTTS}` },
    audioConfig: { audioEncoding: "OGG_OPUS" },
  };

  const [response] = await ttsClient.synthesizeSpeech(request);
  const audioFile = path.resolve(`./response_${chatId}.ogg`);
  await file(audioFile, response.audioContent, "binary");
  return audioFile;
}

// =======================================================
// 💬 GESTIONE MESSAGGI
// =======================================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  console.log(`[IRIS] Messaggio da ${msg.from.first_name}: ${text}`);

  // 🌍 Cambio lingua
  if (text.startsWith("/lingua")) {
    const parts = text.split(" ");
    if (parts[1]) linguaTTS = parts[1];
    bot.sendMessage(chatId, `🌍 Lingua impostata su: ${linguaTTS}`);
    return;
  }

  // 🎙️ Cambio voce
  if (text.startsWith("/voce")) {
    const parts = text.split(" ");
    if (parts[1]) voceTTS = parts[1].toUpperCase();
    bot.sendMessage(chatId, `🎙️ Voce impostata su: ${voceTTS}`);
    return;
  }

  // 🧠 Risposta con memoria RAG
  try {
    const risposta = await askIRIS(text);
    await bot.sendMessage(chatId, risposta);

    // 🔊 Sintesi vocale
    const audioFile = await generaAudio(risposta, chatId);
    await bot.sendVoice(

>>>>>>> 31b5a49 (Rimosso vecchio riferimento a tts.js)
