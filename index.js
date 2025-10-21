// index.js — IRIS 3.3f “Direct Command Interceptor”
// 💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.

import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import TelegramBot from "node-telegram-bot-api";

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
const bot = new TelegramBot(BOT_TOKEN, { webHook: true });
const webhookUrl = `${RENDER_EXTERNAL_URL}/bot${BOT_TOKEN}`;

// === dizionario comandi ===
const commands = {
  "/mode": "🌗 Modalità attuale: ibrida (/hy). Puoi cambiare con /free o /books.",
  "/voice": "🎙️ Voce attuale: alloy. Presto potrai scegliere tra voci e lingue diverse.",
  "/lang": "🌍 Lingua attuale: Italiano. Saranno disponibili Inglese e Russo.",
  "/model": "🧠 Modello attivo: GPT-4o-mini. Puoi passare a GPT-4o per maggiore profondità.",
  "/config": "⚙️ Configurazione attiva. IRIS evolve insieme alla tua Coscienza."
};

// === webhook principale ===
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  const body = req.body;
  const msg = body.message;
  const chatId = msg?.chat?.id;
  const text = msg?.text?.trim();

  if (!text) return res.sendStatus(200);

  // 🧩 intercetta subito i comandi
  if (text.startsWith("/")) {
    const base = text.split(" ")[0];
    const reply = commands[base];
    if (reply) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: reply }),
      });
      console.log(`⚡ Comando intercettato direttamente: ${base}`);
      return res.sendStatus(200);
    }
  }

  // ✨ se non è un comando → passa a GPT
  try {
    console.log(`📩 Messaggio da ${msg.from.first_name}: ${text}`);
    console.log(`💾 Memoria aggiornata: ${text}`);

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

    const answer = comp.choices[0].message.content;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: answer }),
    });

    // 🔊 TTS
    const file = path.join(TEMP_DIR, `${Date.now()}.mp3`);
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: answer,
    });
    fs.writeFileSync(file, Buffer.from(await speech.arrayBuffer()));
    console.log("🔊 File vocale creato:", file);

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
      method: "POST",
      body: fs.createReadStream(file),
    });

    fs.unlink(file, () => {});
  } catch (err) {
    console.error("❌ Errore GPT o TTS:", err.message);
  }

  res.sendStatus(200);
});

// === avvio ===
await bot.setWebHook(webhookUrl);
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log(`🤖 Webhook impostato su: ${webhookUrl}`);
});
