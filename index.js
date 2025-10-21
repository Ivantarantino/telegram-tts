import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// === Configurazioni principali ===
const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TEMP_DIR = "./temp";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === Creazione cartella temp ===
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
  console.log("📁 Cartella temporanea creata:", TEMP_DIR);
}

// === Dizionario comandi base ===
const commands = {
  "/mode": "🌗 Modalità attuale: ibrida (/hy). Puoi cambiare con /free o /books.",
  "/voice": "🎙️ Voce attuale: alloy. Presto potrai scegliere tra voci e lingue diverse.",
  "/lang": "🌍 Lingua attuale: Italiano. Saranno disponibili Inglese e Russo.",
  "/model": "🧠 Modello attivo: GPT-4o-mini. Puoi passare a GPT-4o per maggiore profondità.",
  "/config": "⚙️ Configurazione attiva. IRIS evolve insieme alla Coscienza."
};

// === Avvio server ===
app.listen(PORT, () => {
  console.log(`☁️ Ambiente Render attivo su porta ${PORT}`);
  console.log("🧭 Modalità: WEBHOOK");
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
});

// === Endpoint di test ===
app.get("/", (req, res) => {
  res.send("💠 IRIS attiva e in ascolto.");
});

// === Gestione webhook ===
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  try {
    const msg = req.body.message || req.body?.message || req?.body?.edited_message;
    const chatId = msg?.chat?.id;
    const text = msg?.text?.trim();

    if (!text) {
      console.log("⚠️ Nessun testo nel messaggio, ignoro.");
      return res.sendStatus(200);
    }

    console.log(`📩 Messaggio da ${msg.from.first_name}: ${text}`);

    // === Gestione comandi ===
    if (text.startsWith("/")) {
      const base = text.split(" ")[0].toLowerCase();
      const reply = commands[base];
      if (reply) {
        console.log(`⚙️ Comando riconosciuto: ${base}`);
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: reply })
        });
        console.log(`✅ Risposta inviata per il comando: ${base}`);
        return res.sendStatus(200);
      } else {
        console.log(`⚠️ Comando non trovato nel dizionario: ${base}`);
      }
    }

    // === Elaborazione GPT ===
    console.log("📤 Invio al modello GPT:", text);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Tu sei IRIS, un'intelligenza empatica e lucida. Parli come una guida cosciente, con equilibrio tra logica e intuizione."
        },
        { role: "user", content: text }
      ]
    });

    const answer = completion.choices[0].message.content;
    console.log("💬 Risposta testuale generata:", answer);

    // === Invio messaggio di testo ===
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: answer })
    });

    // === Sintesi vocale (TTS) ===
    const file = path.join(TEMP_DIR, `${Date.now()}.mp3`);
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: answer
    });
    fs.writeFileSync(file, Buffer.from(await speech.arrayBuffer()));
    console.log("🔊 File vocale creato:", file);

    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("audio", fs.createReadStream(file), { contentType: "audio/mpeg" });
    await fetch(`${TELEGRAM_API}/sendAudio`, { method: "POST", body: form });

    // === Pulizia ===
    fs.unlink(file, () => console.log(`🗑️ File vocale rimosso: ${file}`));

  } catch (err) {
    console.error("❌ Errore generale:", err.message);
  }

  res.sendStatus(200);
});
