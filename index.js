// index.js — IRIS 5.0.9.x
// ------------------------------------------------------------
// Server principale Telegram + Express per IRIS (ESM compatibile)
// Fix per __dirname in ambiente "type": "module"
// ------------------------------------------------------------

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import TelegramBot from "node-telegram-bot-api";

import { processVoice } from "./adapters/stt.js";
import { speakText } from "./adapters/tts.js";
import { irisHeartSpeak } from "./core/iris_heart_voice.js";
import { getLang, getMode, getModel } from "./core/iris_state.js";
import { ragAnswerFromQuery } from "./core/iris_rag_core.js";

// ------------------------------------------------------------
// FIX DEFINITIVO PER __dirname IN ESM
// ------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------

const TOKEN = process.env.TELEGRAM_API_KEY;
const WEBHOOK_URL = process.env.RENDER_EXTERNAL_URL;
const PORT = process.env.PORT || 10000;

// Temp dir per file audio
const TEMP_DIR = path.join(__dirname, "temp");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Express server
const app = express();
app.use(express.json());

// Telegram bot (webhook mode)
const bot = new TelegramBot(TOKEN, { webHook: true });

// Webhook URL
bot.setWebHook(`${WEBHOOK_URL}/bot${TOKEN}`);

console.log(`🤖 Telegram Bot attivo in webhook su: ${WEBHOOK_URL}/bot${TOKEN}`);

// ------------------------------------------------------------
// Registra comandi Telegram
// ------------------------------------------------------------
bot.setMyCommands([
  { command: "start", description: "Avvia IRIS" },
  { command: "lang", description: "Imposta la lingua" },
  { command: "mode", description: "Imposta la modalità (free/hy/book)" },
  { command: "voice", description: "Imposta la voce TTS" },
  { command: "model", description: "Imposta il modello GPT" },
]);

console.log("✅ Comandi bot impostati (IRIS 5.0.9.x)");

// ------------------------------------------------------------
// ROUTE WEBHOOK
// ------------------------------------------------------------
app.post(`/bot${TOKEN}`, async (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ------------------------------------------------------------
// HANDLER MESSAGGI TESTO
// ------------------------------------------------------------
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;

    // Solo testo o voce gestita dopo
    if (msg.text) {
      const text = msg.text.trim();
      const mode = getMode();
      const lang = getLang();
      const model = getModel();

      let ragContext = null;

      // Se siamo in modalità libro → attiva RAG
      if (mode === "book") {
        try {
          ragContext = await ragAnswerFromQuery(text, mode);
        } catch (err) {
          console.warn("⚠️ Errore RAG:", err.message);
        }
      }

      const answer = await irisHeartSpeak(text, {
        mode,
        lang,
        model,
        name: msg.from?.first_name || "",
        ragContext,
      });

      // Risposta testuale
      await bot.sendMessage(chatId, answer);

      return;
    }

    // --------------------------------------------------------
    // SE C'È UN AUDIO → STT → INTERPRETA TESTO → RISPOSTA
    // --------------------------------------------------------
    if (msg.voice || msg.audio) {
      const fileId = msg.voice?.file_id || msg.audio?.file_id;
      const file = await bot.getFile(fileId);

      const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

      const transcript = await processVoice(url);
      if (!transcript) {
        await bot.sendMessage(chatId, "Non riesco a capire l’audio.");
        return;
      }

      const mode = getMode();
      const lang = getLang();
      const model = getModel();

      let ragContext = null;
      if (mode === "book") {
        try {
          ragContext = await ragAnswerFromQuery(transcript.text, mode);
        } catch (err) {
          console.warn("⚠️ Errore RAG audio:", err.message);
        }
      }

      const answer = await irisHeartSpeak(transcript.text, {
        mode,
        lang,
        model,
        name: msg.from?.first_name || "",
        ragContext,
      });

      await bot.sendMessage(chatId, answer);

      return;
    }
  } catch (err) {
    console.error("❌ Errore handler message:", err);
  }
});

// ------------------------------------------------------------
// EXPRESS LISTEN
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🌍 Server Express attivo su porta ${PORT}`);
});
