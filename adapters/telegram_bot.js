// adapters/telegram_bot.js
// -----------------------------------------------------------------------------
// IRIS Telegram Bot — compatibile con scaffold 5.0.8.0
// Include:
// ✅ bootstrapTelegram (export richiesto da index.js)
// ✅ fix doppia risposta ai vocali
// ✅ import robusti per STT e Cuore
// ✅ /essence testuale
// ✅ webhook gestito da index.js (no polling)
// -----------------------------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import * as STT from "./stt.js";
import { getEssence } from "../core/iris_essence_core.js";
import * as Heart from "../core/iris_heart_voice.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

// -----------------------------------------------------------------------------
// Risoluzione tollerante STT
// -----------------------------------------------------------------------------
function resolveTranscribe(mod) {
  if (mod && typeof mod.transcribeAudio === "function") return mod.transcribeAudio;
  if (mod && typeof mod.transcribe === "function") return mod.transcribe;
  if (mod && typeof mod.whisperTranscribe === "function") return mod.whisperTranscribe;
  if (mod && typeof mod.default === "function") return mod.default;
  if (mod?.default?.transcribeAudio) return mod.default.transcribeAudio;
  if (mod?.default?.transcribe) return mod.default.transcribe;
  if (mod?.default?.whisperTranscribe) return mod.default.whisperTranscribe;
  return async () => "";
}
const rawTranscribe = resolveTranscribe(STT);

async function callTranscribe(sttFn, botInstance, fileId) {
  try {
    if (sttFn.length >= 2) return await sttFn(botInstance, fileId);
    if (sttFn.length === 1) return await sttFn(fileId);
    return await sttFn({ bot: botInstance, fileId });
  } catch (err) {
    console.error("❌ STT call failed:", err);
    return "";
  }
}

// -----------------------------------------------------------------------------
// Risoluzione tollerante Cuore
// -----------------------------------------------------------------------------
function resolveHandleIrisMessage(mod) {
  if (mod && typeof mod.handleIrisMessage === "function") return mod.handleIrisMessage;
  if (mod && typeof mod.handleMessage === "function") return mod.handleMessage;
  if (mod && typeof mod.default === "function") return mod.default;
  if (mod?.default?.handleIrisMessage) return mod.default.handleIrisMessage;
  if (mod?.default?.handleMessage) return mod.default.handleMessage;
  return async (text) =>
    `⚠️ (fallback) Router cuore non trovato. Ricevuto: “${text}”.`;
}
const handleIrisMessage = resolveHandleIrisMessage(Heart);

// -----------------------------------------------------------------------------
// Bot setup
// -----------------------------------------------------------------------------
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
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

    const text = await callTranscribe(rawTranscribe, bot, fileId);
    console.log(`🗣️ Trascrizione Whisper: "${text}"`);

    if (!text || !text.trim()) {
      await safeSend(chatId, "Sento il silenzio tra le parole... se vuoi ripeti. 🌿");
      return;
    }

    const reply = await handleIrisMessage(text, msg);
    await safeSend(chatId, reply);
  } catch (err) {
    console.error("❌ Errore gestione vocale:", err);
    await safeSend(chatId, "Qualcosa è andato storto con la voce. 💫");
  }
});

// -----------------------------------------------------------------------------
// MESSAGE HANDLER (solo testo; i vocali li gestisce 'voice')
// -----------------------------------------------------------------------------
bot.on("message", async (msg) => {
  if (msg.voice) return; // evita doppio trigger

  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  if (!text) return;

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

// -----------------------------------------------------------------------------
// EXPORTS
// -----------------------------------------------------------------------------

/**
 * Compatibile con index.js del 5.0.8.0
 * index.js → import { bootstrapTelegram } from "./adapters/telegram_bot.js"
 */
export function bootstrapTelegram() {
  console.log("🤖 IRIS Telegram Bot inizializzato (bootstrapTelegram).");
  return bot;
}

export default bot;
