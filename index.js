/**
 * 🤖 IRIS 2.1 – Core Engine (Render + Webhook + TTS multiplo)
 * Include: RAG Search, OpenAI, Google TTS, Bark placeholder.
 */

import fs from "fs";
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { ragSearch } from "./ragSearch.js";
import { generateTTS } from "./tts.js"; // OpenAI
import { generateTTS_Google } from "./tts_google.js"; // Google
import { generateTTS_Bark } from "./tts_bark.js"; // Bark
dotenv.config();

// === CONFIGURAZIONE BASE ===
const app = express();
app.use(express.json());
const TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;
const MODE = process.env.MODE || "HYBRID";

if (!TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN mancante nelle variabili d'ambiente.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: MODE === "POLLING" });
let voiceMode = "openai"; // Modalità vocale predefinita

// === SERVER EXPRESS (Render) ===
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`☁️ Ambiente Render attivo su porta ${PORT}`);
  console.log(`🤖 Webhook impostato su: https://telegram-tts.onrender.com/bot${TOKEN}`);
  console.log(`🧭 Modalità iniziale: ${MODE.toUpperCase()}`);
  console.log(`🌍 Server attivo su porta ${PORT}`);
});

// === COMANDO /voice ===
bot.onText(/^\/voice (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const choice = match[1].trim().toLowerCase();

  if (["openai", "google", "bark"].includes(choice)) {
    voiceMode = choice;
    await bot.sendMessage(
      chatId,
      `🔊 Modalità vocale impostata su: *${choice.toUpperCase()}*`,
      { parse_mode: "Markdown" }
    );
  } else {
    await bot.sendMessage(
      chatId,
      "Usa `/voice openai`, `/voice google` oppure `/voice bark` per scegliere la voce.",
      { parse_mode: "Markdown" }
    );
  }
});

// === GESTIONE MESSAGGI TESTUALI ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Ignora i comandi
  if (!text || text.startsWith("/")) return;

  console.log(`📩 Messaggio da ${msg.from.first_name}: ${text}`);

  try {
    // 🔍 Ricerca contestuale tramite RAG
    const response = await ragSearch(text);
    const replyText = response?.text || "Non ho trovato nulla, ma sono qui 🌸";

    // ✉️ Invio risposta testuale
    await bot.sendMessage(chatId, replyText);

    // 🎧 Generazione vocale
    let audioPath = null;
    try {
      if (voiceMode === "google") {
        audioPath = await generateTTS_Google(replyText);
      } else if (voiceMode === "openai") {
        audioPath = await generateTTS(replyText);
      } else if (voiceMode === "bark") {
        audioPath = await generateTTS_Bark(replyText);
      }

      if (audioPath) {
        await bot.sendVoice(chatId, fs.createReadStream(audioPath));
      }
    } catch (ttsErr) {
      console.error("❌ Errore generazione vocale:", ttsErr);
    }
  } catch (err) {
    console.error("❌ Errore gestione messaggio:", err);
    await bot.sendMessage(chatId, "⚠️ Si è verificato un errore interno, riprova più tardi.");
  }
});

// === GESTIONE WEBHOOK TELEGRAM ===
if (MODE === "HYBRID" || MODE === "WEBHOOK-ONLY") {
  bot.setWebHook(`https://telegram-tts.onrender.com/bot${TOKEN}`)
    .then(() => console.log("🔗 Webhook impostato correttamente."))
    .catch((err) => console.error("❌ Errore setWebhook:", err));
}
