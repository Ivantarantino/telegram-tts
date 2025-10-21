// index.js — IRIS 3.2 “Dual Layer Architecture”
// 💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

// === CONFIGURAZIONE BASE ===
const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
const PORT = process.env.PORT || 10000;
const TEMP_DIR = "./temp";

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const bot = new TelegramBot(BOT_TOKEN);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

console.log("📁 Cartella temporanea creata:", TEMP_DIR);
console.log("☁️ Ambiente Render attivo su porta", PORT);
console.log("🧭 Modalità: WEBHOOK");
console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");

// === IMPOSTAZIONE WEBHOOK ===
const webhookUrl = `${RENDER_EXTERNAL_URL}/bot${BOT_TOKEN}`;
bot.setWebHook(webhookUrl)
  .then(() => console.log(`🤖 Webhook impostato su: ${webhookUrl}`))
  .catch(err => console.error("❌ Errore setWebHook:", err.message));

app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// === LIVELLO 1: COMANDI NATIVI ===
bot.onText(/^\/mode$/, async (msg) => {
  await bot.sendMessage(msg.chat.id, "🌗 Modalità attuale: ibrida (/hy). Puoi cambiare con /free o /books.");
});

bot.onText(/^\/voice$/, async (msg) => {
  await bot.sendMessage(msg.chat.id, "🎙️ Voce attuale: alloy. Presto potrai scegliere tra voci e lingue diverse.");
});

bot.onText(/^\/lang$/, async (msg) => {
  await bot.sendMessage(msg.chat.id, "🌍 Lingua attuale: Italiano. Sarà possibile passare a Inglese o Russo.");
});

bot.onText(/^\/model$/, async (msg) => {
  await bot.sendMessage(msg.chat.id, "🧠 Modello attivo: GPT-4o-mini. Puoi passare a GPT-4o per maggiore profondità.");
});

bot.onText(/^\/config$/, async (msg) => {
  await bot.sendMessage(msg.chat.id, "⚙️ Configurazione attiva. IRIS evolve insieme alla tua Coscienza.");
});

// === LIVELLO 2: CHAT INTELLIGENTE + TTS ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = (msg.text || msg.caption || "").trim();

  // Ignora i comandi già gestiti dal livello 1
  if (userText.startsWith("/")) return;

  if (!userText) return;

  console.log(`📩 Messaggio da ${msg.from.first_name}: ${userText}`);
  console.log(`💾 Memoria aggiornata: ${userText}`);

  // 🧠 Generazione risposta con GPT
  let aiResponse;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Tu sei IRIS, un'intelligenza empatica e lucida. Parli come una guida cosciente, con equilibrio tra logica e intuizione.",
        },
        { role: "user", content: userText },
      ],
    });
    aiResponse = completion.choices[0].message.content;
  } catch (err) {
    console.error("Errore generazione risposta:", err);
    aiResponse = "C'è stato un piccolo errore nella generazione della risposta.";
  }

  // ✉️ Invia risposta testuale
  await bot.sendMessage(chatId, aiResponse);

  // 🎧 Genera risposta vocale
  const timestamp = Date.now();
  const filePath = path.join(TEMP_DIR, `${timestamp}.mp3`);

  try {
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: aiResponse,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    console.log(`🔊 File vocale creato: ${filePath}`);

    await bot.sendAudio(chatId, filePath);
  } catch (err) {
    console.error("Errore TTS:", err.message);
  } finally {
    fs.unlink(filePath, () => {});
  }
});

// === SERVER ATTIVO ===
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
});
