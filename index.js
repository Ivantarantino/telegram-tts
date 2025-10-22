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

if (!BOT_TOKEN) {
  console.error("❌ ERRORE: Nessuna variabile BOT_TOKEN o TELEGRAM_TOKEN trovata. Telegram non potrà comunicare con il server.");
} else {
  console.log("🤖 BOT_TOKEN caricato correttamente.");
  console.log(`🔗 Webhook atteso su: /bot${BOT_TOKEN}`);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TEMP_DIR = "./temp";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === Inizializzazione cartella temporanea ===
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
  console.log("📁 Cartella temporanea creata:", TEMP_DIR);
}

// === ROUTE TELEGRAM WEBHOOK ===
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;

    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    console.log(`📩 Messaggio da ${message.from?.first_name || "utente"}: ${text}`);

    // === Comando: /mode ===
    if (text === "/mode") {
      console.log("⚙️ Comando riconosciuto: /mode");

      await sendTextMessage(chatId, "💾 Memoria aggiornata: /mode");
      const audioFile = await generateVoice("Memoria aggiornata: modalità attiva");
      await sendVoiceMessage(chatId, audioFile);

      console.log("✅ Risposta vocale inviata");
      return res.sendStatus(200);
    }

    // === Default: Risposta di fallback ===
    await sendTextMessage(chatId, "🌐 IRIS è attiva ma non ha riconosciuto il comando.");
    return res.sendStatus(200);

  } catch (error) {
    console.error("❌ Errore nel webhook Telegram:", error);
    return res.sendStatus(500);
  }
});

// === Funzione: invio messaggio di testo ===
async function sendTextMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// === Funzione: generazione vocale ===
async function generateVoice(text) {
  const filePath = path.join(TEMP_DIR, `${Date.now()}.mp3`);
  const mp3 = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  console.log("🔊 File vocale creato:", filePath);
  return filePath;
}

// === Funzione: invio messaggio vocale ===
async function sendVoiceMessage(chatId, filePath) {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("voice", fs.createReadStream(filePath));

  await fetch(`${TELEGRAM_API}/sendVoice`, {
    method: "POST",
    body: formData,
  });
}

// === Server in ascolto ===
app.listen(PORT, () => {
  console.log(`☁️ Ambiente Render attivo su porta ${PORT}`);
  console.log("🧭 Modalità: WEBHOOK");
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
  console.log(`🌍 Server attivo su porta ${PORT}`);
});

