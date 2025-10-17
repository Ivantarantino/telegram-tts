// =============================
// 🤖 IRIS 1.0 – Versione completa aggiornata
// =============================

// --- Import delle librerie principali ---
import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import textToSpeech from "@google-cloud/text-to-speech";
import OpenAI from "openai";

// --- Configurazioni ambiente ---
import dotenv from "dotenv";
dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!TELEGRAM_TOKEN || !OPENAI_API_KEY || !GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("❌ ERRORE: variabili ambiente mancanti!");
  process.exit(1);
}

// --- Inizializzazione bot e servizi ---
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const client = new textToSpeech.TextToSpeechClient();

// --- Percorsi e costanti ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.join(__dirname, "voice.ogg");

// --- Variabili globali IRIS ---
let voiceType = "it-IT-Standard-B"; // voce femminile naturale
let languageCode = "it-IT";

// --- Funzione Google TTS ---
async function generateVoice(text) {
  const request = {
    input: { text },
    voice: { languageCode, name: voiceType },
    audioConfig: { audioEncoding: "OGG_OPUS" },
  };
  const [response] = await client.synthesizeSpeech(request);
  fs.writeFileSync(OUTPUT_PATH, response.audioContent, "binary");
  return OUTPUT_PATH;
}

// --- Funzione per rispondere tramite OpenAI ---
async function askOpenAI(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ Errore OpenAI:", err);
    return "Si è verificato un errore nel collegamento con la mente di IRIS.";
  }
}

// --- Gestione dei messaggi Telegram ---
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Evita di rispondere ai messaggi vuoti
  if (!text) return;

  console.log(`💬 Messaggio ricevuto da ${msg.from.username}: ${text}`);

  // Comandi personalizzati
  if (text.startsWith("/voce")) {
    const arg = text.split(" ")[1];
    if (arg) {
      voiceType = `it-IT-Standard-${arg.toUpperCase()}`;
      bot.sendMessage(chatId, `🎙️ Voce impostata su: ${voiceType}`);
    } else {
      bot.sendMessage(chatId, `Voce attuale: ${voiceType}`);
    }
    return;
  }

  if (text.startsWith("/lingua")) {
    const arg = text.split(" ")[1];
    if (arg) {
      languageCode = arg;
      bot.sendMessage(chatId, `🌍 Lingua impostata su: ${languageCode}`);
    } else {
      bot.sendMessage(chatId, `Lingua attuale: ${languageCode}`);
    }
    return;
  }

  if (text === "/stato") {
    bot.sendMessage(chatId, `🧠 Stato di IRIS:\nVoce: ${voiceType}\nLingua: ${languageCode}`);
    return;
  }

  // Elaborazione standard con mente IRIS
  bot.sendChatAction(chatId, "typing");

  const responseText = await askOpenAI(text);
  await bot.sendMessage(chatId, responseText);

  // Genera e invia risposta vocale
  try {
    const audioPath = await generateVoice(responseText);
    await bot.sendVoice(chatId, fs.createReadStream(audioPath));
  } catch (err) {
    console.error("Errore generazione voce:", err);
    bot.sendMessage(chatId, "⚠️ Errore nella generazione della voce.");
  }
});

// =============================
// 🌐 Server Express per Render
// =============================

const app = express();

app.get("/", (_, res) => res.send("IRIS è attiva e funzionante 🔮"));
app.get("/health", (_, res) => res.json({ ok: true }));
app.get("/uptime", (_, res) => res.json({ uptime_s: Math.round(process.uptime()) }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`[IRIS] Health server in ascolto sulla porta ${PORT}`));

