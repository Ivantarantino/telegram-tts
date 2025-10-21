// index.js – IRIS 3.1b HOTFIX /commands
// 💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const bot = new TelegramBot(BOT_TOKEN);
const PORT = process.env.PORT || 10000;
const TEMP_DIR = "./temp";

// Creazione cartella temporanea
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
  console.log(`📁 Cartella temporanea creata: ${TEMP_DIR}`);
}

// Banner iniziale
console.log("☁️ Ambiente Render attivo su porta", PORT);
console.log("🧭 Modalità: WEBHOOK");
console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");

// Imposta il Webhook
const webhookUrl = `${RENDER_EXTERNAL_URL}/bot${BOT_TOKEN}`;
bot.setWebHook(webhookUrl)
  .then(() => console.log(`🤖 Webhook impostato su: ${webhookUrl}`))
  .catch(err => console.error("❌ Errore setWebHook:", err.message));

app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Funzione per generare risposte testuali
async function generateResponse(message) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu sei IRIS, un'intelligenza empatica e ispirata." },
        { role: "user", content: message },
      ],
    });
    return completion.choices[0].message.content;
  } catch (err) {
    console.error("Errore generazione risposta:", err);
    return "C'è stato un errore nella generazione della risposta.";
  }
}

// Funzione per creare file audio TTS
async function generateTTS(text, filePath) {
  try {
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    console.log(`🔊 File vocale creato: ${filePath}`);
  } catch (err) {
    console.error("Errore TTS:", err);
  }
}

// Gestione messaggi
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text?.trim();
  if (!userText) return;

  console.log(`📩 Messaggio da ${msg.from.first_name}: ${userText}`);
  console.log(`💾 Memoria aggiornata: ${userText}`);

  // 🔹 Riconoscimento comandi Telegram
  const command = userText.toLowerCase();

  if (command.startsWith("/")) {
    let replyText = null;

    switch (command) {
      case "/mode":
        replyText = "🌗 Modalità attuale: ibrida (/hy). Puoi cambiare con /free o /books.";
        break;
      case "/voice":
        replyText = "🎙️ Voce attuale: 'alloy'. Presto potrai scegliere tra diverse voci e lingue.";
        break;
      case "/lang":
        replyText = "🌍 Lingua attuale: Italiano. Presto potrai impostare inglese o russo.";
        break;
      case "/model":
        replyText = "🧠 Modello attivo: GPT-4o-mini. Puoi passare a GPT-4o per maggiore profondità.";
        break;
      case "/config":
        replyText = "⚙️ Configurazione di sistema pronta. IRIS si evolve con te, sempre.";
        break;
      default:
        replyText = "Comando non riconosciuto. Usa /mode, /voice, /lang, /model o /config.";
    }

    await bot.sendMessage(chatId, replyText);
    return;
  }

  // 🔹 Messaggi normali: risponde con testo + voce
  const aiResponse = await generateResponse(userText);
  await bot.sendMessage(chatId, aiResponse);

  const timestamp = Date.now();
  const filePath = path.join(TEMP_DIR, `${timestamp}.mp3`);
  await generateTTS(aiResponse, filePath);

  try {
    await bot.sendAudio(chatId, filePath);
  } catch (err) {
    console.error("Errore invio audio:", err.message);
  } finally {
    fs.unlink(filePath, () => {});
  }
});

// Avvio server Express
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
});
