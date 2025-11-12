// adapters/telegram_bot.js
// -----------------------------------------------------------------------------
// IRIS Telegram Bot — fix doppia risposta dei vocali + import robusto
// Pulito da speakText (non necessario ora)
// Compatibile con 5.0.8.0 + webhook gestito da index.js
// -----------------------------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { transcribeAudio } from "./stt.js";
import { getEssence } from "../core/iris_essence_core.js";
import * as Heart from "../core/iris_heart_voice.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

// Webhook mode (Render gestisce i webhook, non il polling)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// -----------------------------------------------------------------------------
// Adattatore: trova la funzione cuore indipendentemente dall’export
// -----------------------------------------------------------------------------
function resolveHandleIrisMessage(mod) {
  if (mod && typeof mod.handleIrisMessage === "function") return mod.handleIrisMessage;
  if (mod && typeof mod.handleMessage === "function") return mod.handleMessage;
  if (mod && typeof mod.default === "function") return mod.default;
  if (mod && mod.default && typeof mod.default.handleIrisMessage === "function")
    return mod.default.handleIrisMessage;
  if (mod && mod.default && typeof mod.default.handleMessage === "function")
    return mod.default.handleMessage;
  return async (text) =>
    `⚠️ (fallback) Non trovo il cuore attivo. Ho ricevuto: “${text}”.`;
}

const handleIrisMessage = resolveHandleIrisMessage(Heart);

// -----------------------------------------------------------------------------
// Prevenzione doppie risposte per i vocali
// -----------------------------------------------------------------------------
const recentVoiceMessages = new Set();
const VOICE_CACHE_TTL_MS = 8000;

async function safeSend(chatId, text, options = {}) {
  try {
    return await bot.sendMessage(chatId, text, options);
  } catch (err) {
    console.error("❌ Telegram sendMessage error:", err);
  }
}

// -----------------------------------------------------------------------------
// VOICE HANDLER
// -----------------------------------------------------------------------------
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const fileId = msg.voice?.file_id;

  try {
    if (recentVoiceMessages.has(messageId)) return;
    recentVoiceMessages.add(messageId);
    setTimeout(() => recentVoiceMessages.delete(messageId), VOICE_CACHE_TTL_MS);

    if (!fileId) {
      await safeSend(chatId, "Non ho ricevuto il file vocale. Puoi ripetere? 🌿");
      return;
    }

    const text = await transcribeAudio(bot, fileId);
    console.log(`🗣️ Trascrizione Whisper: "${text}"`);

    if (!text || !text.trim()) {
      await safeSend(chatId, "Sento il silenzio tra le parole... se vuoi ripeti. 🌿");
      return;
    }

    const reply = await handleIrisMessage(text, msg);
    await safeSend(chatId, reply);
  } catch (err) {
    console.error("❌ Errore nella gestione del vocale:", err);
    await safeSend(chatId, "Qualcosa è andato storto con la voce. 💫");
  }
});

// -----------------------------------------------------------------------------
// MESSAGE HANDLER (solo testo; i vocali sono già gestiti sopra)
// -----------------------------------------------------------------------------
bot.on("message", async (msg) => {
  if (msg.voice) return; // evita doppio trigger

  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  if (!text) return;

  // Comando /essence
  if (text.startsWith("/essence")) {
    const reply = await getEssence();
    await safeSend(chatId, reply);
    return;
  }

  try {
    const reply = await handleIrisMessage(text, msg);
    await safeSend(chatId, reply);
  } catch (err) {
    console.error("❌ Errore handleIrisMessage:", err);
    await safeSend(chatId, "C'è un piccolo nodo nel flusso. Riproviamo tra un respiro. 🌿");
  }
});

export default bot;
