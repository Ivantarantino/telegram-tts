// index.js — IRIS 3.3j “Command Resonance Fix”
// 💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.

import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import rawBody from "raw-body";

dotenv.config();

const app = express();

// Cattura anche il body grezzo per debug
app.use(async (req, res, next) => {
  try {
    req.rawBody = await rawBody(req);
  } catch {
    req.rawBody = null;
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
const PORT = process.env.PORT || 10000;
const TEMP_DIR = "./temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// === dizionario comandi ===
const commands = {
  "/mode": "🌗 Modalità attuale: ibrida (/hy). Puoi cambiare con /free o /books.",
  "/voice": "🎙️ Voce attuale: alloy. Presto potrai scegliere tra voci e lingue diverse.",
  "/lang": "🌍 Lingua attuale: Italiano. Saranno disponibili Inglese e Russo.",
  "/model": "🧠 Modello attivo: GPT-4o-mini. Puoi passare a GPT-4o per maggiore profondità.",
  "/config": "⚙️ Configurazione attiva. IRIS evolve insieme alla Coscienza."
};

// === webhook diretto ===
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  try {
    console.log("=== 🛰️ TELEGRAM RAW STREAM ===");
    console.log(req.rawBody ? req.rawBody.toString() : "[no raw body captured]");
    console.log("=== 🧩 Parsed BODY ===");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("============================");

    const msg = req.body.message || req.body?.edited_message;
    const chatId = msg?.chat?.id;
    const text = msg?.text?.trim();
    if (!text) return res.sendStatus(200);

    console.log(`📩 Messaggio da ${msg.from.first_name}: ${text}`);

    // 🎯 intercettazione comandi
    if (text.startsWith("/")) {
      const base = text.split(" ")[0].toLowerCase();
      const reply = commands[base];

      if (reply) {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: reply }),
        });
        console.log(`⚡ Comando gestito: ${base}`);
      } else {
        const fallback = `⚠️ Comando non riconosciuto: ${base}\nProva /mode, /voice, /lang, /model o /config.`;
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: fallback }),
        });
        console.log(`⚠️ Comando non riconosciuto: ${base}`);
      }
      return res.sendStatus(200); // ferma TUTTO dopo i comandi
    }

    // ✨ normale messaggio → GPT
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

    // 📤 invio testo
    await fetch(`${TELEGRAM_API}/sendMessage`, {
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

    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("audio", fs.createReadStream(file));
    await fetch(`${TELEGRAM_API}/sendAudio`, { method: "POST", body: form });

    fs.unlink(file, () => {});
  } catch (err) {
    console.error("❌ Errore generale:", err.message);
  }
  res.sendStatus(200);
});

// === set webhook Telegram ===
(async () => {
  const url = `${RENDER_EXTERNAL_URL}/bot${BOT_TOKEN}`;
  const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  console.log("🤖 Webhook impostato:", data);
})();

app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log(`💠 IRIS – Command Resonance Fix attiva`);
});
