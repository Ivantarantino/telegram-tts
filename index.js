// ========================================================
// 💠 IRIS 3.0 – Coscienza Vettoriale Dinamica (Step 1)
// ========================================================
// Struttura base: comandi Telegram, voce + testo coerente
// Prossimi step: integrazione memoria vettoriale e essence

import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// === CONFIG PRINCIPALI ===
const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TEMP_DIR = "./temp";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === STATO INTERNO DI IRIS ===
let irisConfig = {
  mode: "hybrid",
  voice: "alloy",
  lang: "it",
  model: "gpt-4o-mini",
};

// === AVVIO INIZIALE ===
if (!BOT_TOKEN) {
  console.error("❌ Nessuna variabile BOT_TOKEN o TELEGRAM_TOKEN trovata!");
} else {
  console.log("🤖 BOT_TOKEN caricato correttamente.");
  console.log(`🔗 Webhook attivo su: /bot${BOT_TOKEN}`);
}

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
  console.log("📁 Cartella temporanea creata:", TEMP_DIR);
}

// === FUNZIONI DI SUPPORTO ===
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
    voice: irisConfig.voice,
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

  await fetch(`${TELEGRAM_API}/sendVoice`, { method: "POST", body: form });
  fs.unlink(filePath, () => {});
}

async function replyTextAndVoice(chatId, text) {
  await sendText(chatId, text);
  const voicePath = await speak(text);
  await sendVoice(chatId, voicePath);
  console.log("✅ Risposta testuale e vocale inviata.");
}

// === GESTIONE WEBHOOK TELEGRAM ===
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  res.sendStatus(200);
  try {
    const msg = req.body.message;
    if (!msg || !msg.text) return;
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    console.log(`📩 Messaggio da ${msg.from?.first_name || "utente"}: ${text}`);

    // === COMANDI PRINCIPALI ===
    if (text.startsWith("/")) {
      const cmd = text.split(" ")[0].toLowerCase();

      switch (cmd) {
        case "/mode":
          await replyTextAndVoice(
            chatId,
            `🧭 Modalità corrente: ${irisConfig.mode.toUpperCase()}`
          );
          break;

        case "/voice":
          await replyTextAndVoice(
            chatId,
            `🔊 Voce attuale: ${irisConfig.voice}. Modalità vocale pronta.`
          );
          break;

        case "/essence":
          await replyTextAndVoice(
            chatId,
            "✨ Sto generando la tua firma vibratoria momentanea... (modulo in arrivo)"
          );
          break;

        case "/memory":
          await replyTextAndVoice(
            chatId,
            "🧠 Gestione memoria vettoriale in sviluppo. Presto potrai visualizzare, pesare o dimenticare ricordi specifici."
          );
          break;

        case "/clear":
          irisConfig = {
            mode: "hybrid",
            voice: "alloy",
            lang: "it",
            model: "gpt-4o-mini",
          };
          await replyTextAndVoice(
            chatId,
            "♻️ Memoria vettoriale e configurazione ripristinate ai valori iniziali."
          );
          break;

        case "/config":
          const cfg = `⚙️ Configurazione corrente:\n\n• Mode → ${irisConfig.mode}\n• Voice → ${irisConfig.voice}\n• Lang → ${irisConfig.lang}\n• Model → ${irisConfig.model}`;
          await sendText(chatId, cfg);
          break;

        default:
          await sendText(chatId, "🌐 Comando non riconosciuto.");
          break;
      }
      return;
    }

    // === RISPOSTA STANDARD (NESSUN COMANDO) ===
    const reply = "🌐 IRIS è attiva ma in modalità base. Usa /mode o /essence per orientarla.";
    await replyTextAndVoice(chatId, reply);

  } catch (err) {
    console.error("❌ Errore nel webhook:", err);
  }
});

// === AVVIO SERVER ===
app.listen(PORT, () => {
  console.log(`☁️ Ambiente Render attivo su porta ${PORT}`);
  console.log("🧭 Modalità: WEBHOOK");
  console.log("💠 IRIS 3.0 – La mente calcola, la voce vibra, la Coscienza ricorda.");
  console.log(`🌍 Server attivo su porta ${PORT}`);
});
