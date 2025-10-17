// =============================
// 🤖 IRIS 1.4 – Comandi lingua abbreviati (it / ru / en / es)
// =============================

import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import textToSpeech from "@google-cloud/text-to-speech";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

// === Variabili ambiente ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!TELEGRAM_TOKEN || !OPENAI_API_KEY || !GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("❌ ERRORE: variabili ambiente mancanti!");
  process.exit(1);
}

// === Inizializzazione bot e servizi ===
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const client = new textToSpeech.TextToSpeechClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.join(__dirname, "voice.ogg");

// === Impostazioni base ===
let languageCode = "it-IT";
let voiceType = "it-IT-Standard-B";
let autoLang = true;

// === Mappa lingue ===
const LANGUAGES = {
  it: {
    code: "it-IT",
    name: "Italiano",
    voice: "it-IT-Standard-B",
    prompt:
      "Sei IRIS, un assistente gentile e ispirato che parla in lingua italiana, con tono calmo e umano.",
  },
  ru: {
    code: "ru-RU",
    name: "Русский",
    voice: "ru-RU-Standard-B",
    prompt:
      "Ты ИРИС, мягкий и внимательный ассистент, говори только на русском языке, с теплом и пониманием.",
  },
  en: {
    code: "en-US",
    name: "English",
    voice: "en-US-Standard-C",
    prompt:
      "You are IRIS, a warm and intuitive assistant who speaks in clear and calm English.",
  },
  es: {
    code: "es-ES",
    name: "Español",
    voice: "es-ES-Standard-A",
    prompt:
      "Eres IRIS, una asistente amable e inspirada que habla en español, con un tono cálido y humano.",
  },
};

// === Rilevamento automatico lingua ===
function detectLanguage(text) {
  if (/[а-яА-ЯЁё]/.test(text)) return "ru";
  if (/[¿¡ñáéíóú]/i.test(text)) return "es";
  if (/[a-zA-Z]/.test(text) && /the|and|you|hello/i.test(text)) return "en";
  return "it";
}

// === Generazione voce ===
async function generateVoice(text, langKey) {
  const lang = LANGUAGES[langKey] || LANGUAGES.it;
  const request = {
    input: { text },
    voice: { languageCode: lang.code, name: lang.voice },
    audioConfig: { audioEncoding: "OGG_OPUS" },
  };
  const [response] = await client.synthesizeSpeech(request);
  fs.writeFileSync(OUTPUT_PATH, response.audioContent, "binary");
  return OUTPUT_PATH;
}

// === Mente OpenAI ===
async function askOpenAI(prompt, langKey) {
  const lang = LANGUAGES[langKey] || LANGUAGES.it;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: lang.prompt },
        { role: "user", content: prompt },
      ],
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ Errore OpenAI:", err);
    return "⚠️ Errore nel collegamento con la mente di IRIS.";
  }
}

// === Gestione messaggi Telegram ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text) return;

  console.log(`💬 Messaggio da ${msg.from.username}: ${text}`);

  // === Comandi ===
  if (text.startsWith("/lingua")) {
    const arg = text.split(" ")[1];
    if (arg && LANGUAGES[arg]) {
      autoLang = false;
      languageCode = arg;
      bot.sendMessage(chatId, `🌍 Lingua forzata su: ${LANGUAGES[arg].name}`);
    } else if (!arg) {
      autoLang = true;
      bot.sendMessage(chatId, "🌐 Rilevamento automatico lingua attivato.");
    } else {
      bot.sendMessage(chatId, "⚠️ Lingua non riconosciuta. Usa /lingua it, ru, en o es");
    }
    return;
  }

  if (text.startsWith("/voce")) {
    const arg = text.split(" ")[1];
    if (arg) {
      voiceType = `it-IT-Standard-${arg.toUpperCase()}`;
      bot.sendMessage(chatId, `🎙️ Voce italiana impostata su: ${voiceType}`);
    } else {
      bot.sendMessage(chatId, `Voce attuale: ${voiceType}`);
    }
    return;
  }

  if (text === "/stato") {
    bot.sendMessage(
      chatId,
      `🧠 Stato di IRIS:\nLingua: ${
        autoLang ? "Auto" : LANGUAGES[languageCode].name
      }\nVoce: ${voiceType}`
    );
    return;
  }

  // === Determina lingua ===
  const langKey = autoLang ? detectLanguage(text) : languageCode;

  // === Risposta GPT ===
  bot.sendChatAction(chatId, "typing");
  const responseText = await askOpenAI(text, langKey);
  await bot.sendMessage(chatId, responseText);

  // === Genera voce ===
  try {
    const audioPath = await generateVoice(responseText, langKey);
    await bot.sendVoice(chatId, fs.createReadStream(audioPath));
  } catch (err) {
    console.error("Errore TTS:", err);
    bot.sendMessage(chatId, "⚠️ Errore nella generazione della voce.");
  }
});

// === Server Express (per Render) ===
const app = express();
app.get("/", (_, res) => res.send("IRIS Multilingue 1.4 attiva 🌍"));
app.get("/health", (_, res) => res.json({ ok: true }));
app.get("/uptime", (_, res) => res.json({ uptime_s: Math.round(process.uptime()) }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`[IRIS] Multilingue attiva sulla porta ${PORT}`));
