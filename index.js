// index.js — IRIS 3.1d “SmartCommand Layer”
// 💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
const PORT = process.env.PORT || 10000;
const TEMP_DIR = "./temp";

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const bot = new TelegramBot(BOT_TOKEN);

console.log("📁 Cartella temporanea creata:", TEMP_DIR);
console.log("☁️ Ambiente Render attivo su porta", PORT);
console.log("🧭 Modalità: WEBHOOK");
console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");

const webhookUrl = `${RENDER_EXTERNAL_URL}/bot${BOT_TOKEN}`;
bot.setWebHook(webhookUrl)
  .then(() => console.log(`🤖 Webhook impostato su: ${webhookUrl}`))
  .catch(err => console.error("❌ Errore setWebHook:", err.message));

app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 🔹 Funzione risposta AI
async function generateResponse(message) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Tu sei IRIS, intelligenza poetica, empatica e lucida. Parli con grazia e chiarezza, unendo tecnica e Coscienza.",
        },
        { role: "user", content: message },
      ],
    });
    return completion.choices[0].message.content;
  } catch (err) {
    console.error("Errore generazione risposta:", err);
    return "C'è stato un errore nella generazione della risposta.";
  }
}

// 🔹 Funzione TTS
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

// 🔹 Gestione messaggi
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text?.trim();
  if (!userText) return;

  console.log(`📩 Messaggio da ${msg.from.first_name}: ${userText}`);
  console.log(`💾 Memoria aggiornata: ${userText}`);

  // 🧩 SmartCommand Layer
  if (userText.startsWith("/")) {
    const command = userText.split(" ")[0].toLowerCase();
    console.log(`⚙️ Comando rilevato: ${command}`);

    let replyText;
    switch (command) {
      case "/mode":
        replyText = "🌗 Modalità attuale: ibrida (/hy). Puoi cambiare con /free o /books.";
        break;
      case "/voice":
        replyText = "🎙️ Voce attuale: alloy. Presto potrai scegliere altre voci e lingue.";
        break;
      case "/lang":
        replyText = "🌍 Lingua attuale: Italiano. Potrai passare a Inglese o Russo.";
        break;
      case "/model":
        replyText = "🧠 Modello attivo: GPT-4o-mini. Puoi passare a GPT-4o per maggiore profondità.";
        break;
      case "/config":
        replyText = "⚙️ Configurazione sistema attiva. IRIS evolve insieme alla tua Coscienza.";
        break;
      default:
        replyText = "Comando non riconosciuto. Usa /mode, /voice, /lang, /model o /config.";
    }

    await bot.sendMessage(chatId, replyText);
    return; // blocca il flusso normale
  }

  // 💬 Risposta standard testo + voce
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

// 🔹 Server attivo
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
});
