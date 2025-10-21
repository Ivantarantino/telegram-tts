// index.js — IRIS 3.3e “Webhook Command Rescue”
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

// === middleware di intercettazione ===
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  const body = req.body;
  const msg = body.message;
  const chatId = msg?.chat?.id;
  const text = msg?.text?.trim();

  // se il testo inizia con /
  if (text && text.startsWith("/")) {
    const base = text.split(" ")[0];
    const reply = commands[base];
    if (reply) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: reply })
      });
      console.log(`⚡ Comando gestito via middleware: ${base}`);
      return res.sendStatus(200); // blocca GPT
    }
  }

  // passa al bot normale
  bot.processUpdate(body);
  res.sendStatus(200);
});

// === set webhook ===
await bot.setWebHook(webhookUrl);

// === GPT handler ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text || text.startsWith("/")) return; // sicurezza

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

app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log(`🤖 Webhook: ${webhookUrl}`);
});
