// index.js — IRIS 3.0i-clean
import fs from "fs";
import path from "path";
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import express from "express";
import {
  chatWithIris,
  setMode,
  getMode,
  getMemoryState,
  essence
} from "./ragSearch.js";

const app = express();
const PORT = process.env.PORT || 10000;

// === Variabili d'ambiente ===
const TELEGRAM_TOKEN =
  process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// === Stato interno ===
let warnedOnce = false;

// === Avvio server Express ===
app.get("/", (req, res) => res.send("🌐 IRIS 3.0i-clean attivo."));
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log("🧭 Modalità iniziale: HY MODE");
});

// === Gestione messaggi Telegram ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : "";
  if (!text) return;

  console.log(`💬 Messaggio ricevuto → ${text}`);

  // Comandi speciali
  if (text.toLowerCase() === "/mode") {
    await bot.sendMessage(chatId, `🔁 Modalità corrente: ${getMode()}`);
    return;
  }
  if (text.toLowerCase().startsWith("/setmode ")) {
    const mode = text.split(" ")[1];
    setMode(mode);
    await bot.sendMessage(chatId, `🧭 Modalità impostata su: ${mode}`);
    return;
  }
  if (text.toLowerCase() === "/memory") {
    const mem = getMemoryState();
    await bot.sendMessage(chatId, JSON.stringify(mem, null, 2));
    return;
  }
  if (text.toLowerCase() === "/essence") {
    const e = await essence();
    await bot.sendMessage(chatId, e);
    return;
  }

  // === Chat standard ===
  let reply;
  try {
    reply = await chatWithIris(text);
  } catch (err) {
    console.error("❌ Errore chatWithIris:", err.message);
    reply = "⚠️ Si è verificato un problema momentaneo con IRIS.";
  }

  // === Generazione vocale ===
  try {
    const ttsPath = path.join(
      "temp",
      `iris_voice_${Date.now()}.ogg`
    );
    const tts = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      format: "ogg",
      input: reply
    });

    const buffer = Buffer.from(await tts.arrayBuffer());
    fs.mkdirSync("temp", { recursive: true });
    fs.writeFileSync(ttsPath, buffer);
    console.log(`🎧 File vocale generato: ${ttsPath}`);

    await bot.sendVoice(chatId, fs.createReadStream(ttsPath));

    // 🧹 elimina file dopo invio
    fs.unlink(ttsPath, (e) => {
      if (e) console.warn("⚠️ Impossibile cancellare file vocale:", e.message);
    });
  } catch (err) {
    console.error("❌ Errore generazione vocale:", err.message);
    await bot.sendMessage(
      chatId,
      "⚠️ Si è verificato un problema momentaneo con IRIS."
    );
  }
});

// === Log filtrato per Qdrant ===
process.on("warning", (w) => {
  if (w.message.includes("iris_docs") && warnedOnce) return;
  if (w.message.includes("iris_docs")) {
    warnedOnce = true;
    console.warn("⚠️ Qdrant: collection 'iris_docs' non trovata (avviso singolo).");
  } else {
    console.warn("⚠️", w.name, w.message);
  }
});
