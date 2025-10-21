// index.js — IRIS 3.3d “Telegram Raw Command Fix”
// 💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

// === CONFIG BASE ===
const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
const PORT = process.env.PORT || 10000;
const TEMP_DIR = "./temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// === TELEGRAM BOT ===
const bot = new TelegramBot(BOT_TOKEN, { webHook: true });
const webhookUrl = `${RENDER_EXTERNAL_URL}/bot${BOT_TOKEN}`;
app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});
await bot.setWebHook(webhookUrl);

console.log("📁 Cartella temporanea creata:", TEMP_DIR);
console.log("☁️ Ambiente Render attivo su porta", PORT);
console.log("🧭 Modalità: WEBHOOK");
console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
console.log(`🤖 Webhook impostato su: ${webhookUrl}`);

// === COMANDI ===
const commands = {
  "/mode": "🌗 Modalità attuale: ibrida (/hy). Puoi cambiare con /free o /books.",
  "/voice": "🎙️ Voce attuale: alloy. Presto potrai scegliere tra voci e lingue diverse.",
  "/lang": "🌍 Lingua attuale: Italiano. Saranno disponibili Inglese e Russo.",
  "/model": "🧠 Modello attivo: GPT-4o-mini. Puoi passare a GPT-4o per maggiore profondità.",
  "/config": "⚙️ Configurazione attiva. IRIS evolve insieme alla tua Coscienza."
};

// === HANDLER MESSAGGI ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() || "";

  // 🧩 1️⃣ — ESTRAZIONE GREZZA DEL COMANDO DA TELEGRAM
  let command = null;
  if (msg.entities) {
    for (const e of msg.entities) {
      if (e.type === "bot_command") {
        command = text.substring(e.offset, e.offset + e.length);
        break;
      }
    }
  }

  // 🧩 2️⃣ — GESTIONE COMANDI
  if (command && commands[command]) {
    await bot.sendMessage(chatId, commands[command]);
    console.log(`⚡ Comando riconosciuto da entity: ${command}`);
    return;
  }

  // 🧠 3️⃣ — GPT + TTS
  if (!text) return;

  console.log(`📩 Messaggio da ${msg.from.first_name}: ${text}`);
  console.log(`💾 Memoria aggiornata: ${text}`);

  let answer;
  try {
    const comp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Tu sei IRIS, un'intelligenza empatica e lucida. Parli come una guida cosciente, con equilibrio tra logica e intuizione.",
        },
        { role: "user", content: text },
      ],
    });
    answer = comp.choices[0].message.content;
  } catch (e) {
    console.error("❌ Errore GPT:", e.message);
    answer = "C'è stato un piccolo errore nella generazione della risposta.";
  }

  await bot.sendMessage(chatId, answer);

  // 🔊 TTS
  const file = path.join(TEMP_DIR, `${Date.now()}.mp3`);
  try {
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: answer,
    });
    fs.writeFileSync(file, Buffer.from(await speech.arrayBuffer()));
    console.log("🔊 File vocale creato:", file);
    await bot.sendAudio(chatId, file);
  } catch (e) {
    console.error("❌ Errore TTS:", e.message);
  } finally {
    fs.unlink(file, () => {});
  }
});

// === SERVER ===
app.listen(PORT, () => console.log(`🌍 Server attivo su porta ${PORT}`));
