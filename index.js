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
import { answerWithRAG } from "./ragSearch.js"; // 🧠 Import corretto

dotenv.config();

// ✅ CONFIGURAZIONE
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🗣️ Configurazione Google TTS
const ttsClient = new textToSpeech.TextToSpeechClient();
const writeFile = util.promisify(fs.writeFile);

// 🎙️ Funzione per generare voce da testo
async function generaVoce(testo, chatId) {
  const richiesta = {
    input: { text: testo },
    voice: { languageCode: "it-IT", name: "it-IT-Wavenet-B" },
    audioConfig: { audioEncoding: "MP3" },
  };

  const [response] = await ttsClient.synthesizeSpeech(richiesta);
  const audioPath = path.resolve(`output-${chatId}.mp3`);
  await writeFile(audioPath, response.audioContent, "binary");
  return audioPath;
}

// 📩 Ricezione messaggi testuali
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // 🎧 Se è un messaggio vocale
  if (msg.voice) {
    bot.sendMessage(chatId, "🎧 Ricevuto messaggio vocale! (in arrivo trascrizione e risposta...)");
    // Qui in futuro potremo aggiungere la trascrizione con Whisper
    return;
  }

  // ✍️ Se è un messaggio testuale
  const testo = msg.text?.trim();
  if (!testo) return;

  console.log(`🔍 Domanda ricevuta: ${testo}`);
  bot.sendMessage(chatId, "🔎 Sto analizzando la tua domanda...");

  try {
    const risposta = await answerWithRAG(testo, "it");

    await bot.sendMessage(chatId, `🧠 *IRIS*: ${risposta}`, {
      parse_mode: "Markdown",
    });

    const audioPath = await generaVoce(risposta, chatId);
    await bot.sendAudio(chatId, audioPath);
    fs.unlinkSync(audioPath);
  } catch (err) {
    console.error("❌ Errore:", err);
    bot.sendMessage(chatId, "⚠️ Si è verificato un errore durante l'elaborazione.");
  }
});

console.log("🚀 IRIS 2.0 è attiva e in ascolto su Telegram!");
