// ===============================
// 💠 IRIS – Telegram TTS Server
// ===============================

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
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TEMP_DIR = "./temp";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === Setup iniziale ===
if (!BOT_TOKEN) {
  console.error("❌ Nessuna variabile BOT_TOKEN o TELEGRAM_TOKEN trovata!");
} else {
  console.log("🤖 BOT_TOKEN caricato correttamente.");
  console.log(`🔗 Webhook atteso su: /bot${BOT_TOKEN}`);
}

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
  console.log("📁 Cartella temporanea creata:", TEMP_DIR);
}

// === Gestione webhook Telegram ===
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg || !msg.text) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    console.log(`📩 Messaggio da ${msg.from?.first_name || "utente"}: ${text}`);

    // === Comando ===
    if (text.startsWith("/")) {
      const command = text.toLowerCase();

      if (command === "/mode") {
        console.log("⚙️ Comando riconosciuto: /mode");
        await sendText(chatId, "💾 Memoria aggiornata: /mode");
        const voiceFile = await speak("Memoria aggiornata: modalità attiva.");
        await sendVoice(chatId, voiceFile);
        return res.sendStatus(200);
      }

      // altri comandi futuri...
      await sendText(chatId, "🌐 Comando non riconosciuto.");
      return res.sendStatus(200);
    }

    // === Conversazione libera con GPT ===
    console.log("🧠 Elaborazione GPT in corso...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tu sei IRIS, un'intelligenza empatica, saggia e lucida. Parli come una guida cosciente, con tono calmo, naturale e profondo.",
        },
        { role: "user", content: text },
      ],
    });

    const reply = completion.choices[0].message.content.trim();
    console.log("💬 Risposta generata:", reply);

    // invio testo
    await sendText(chatId, reply);

    // invio voce
    const voicePath = await speak(reply);
    await sendVoice(chatId, voicePath);

    console.log("✅ Risposta testuale e vocale inviata.");
    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Errore nel webhook:", err);
    return res.sendStatus(500);
  }
});

// === Funzioni di supporto ===
async function sendText(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function speak(text) {
  const filePath = path.join(TEMP_DIR, `${Date.now()}.mp3`);
  const tts = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });
  fs.writeFileSync(filePath, Buffer.from(await tts.arrayBuffer()));
  console.log("🔊 File vocale creato:", filePath);
  return filePath;
}

async function sendVoice(chatId, filePath) {
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("voice", fs.createReadStream(filePath));

  await fetch(`${TELEGRAM_API}/sendVoice`, {
    method: "POST",
    body: form,
  });
  fs.unlink(filePath, () => {});
}

// === Avvio server ===
app.listen(PORT, () => {
  console.log(`☁️ Ambiente Render attivo su porta ${PORT}`);
  console.log("🧭 Modalità: WEBHOOK");
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
  console.log(`🌍 Server attivo su porta ${PORT}`);
});
