// adapters/telegram_bot.js
// -----------------------------------------------------------------------------
// IRIS Telegram Bot — import robusti + fix doppia risposta ai vocali
// - STT import tollerante (qualsiasi export da adapters/stt.js)
// - Cuore import tollerante (già fatto)
// - Niente speakText (non usato ora)
// - Webhook gestito da index.js (qui polling:false)
// -----------------------------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import * as STT from "./stt.js"; // <— import totale, poi risolviamo la funzione giusta
import { getEssence } from "../core/iris_essence_core.js";
import * as Heart from "../core/iris_heart_voice.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

// Webhook mode (Render → index.js fa setWebHook e processUpdate)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// -----------------------------------------------------------------------------
// Risoluzione "tollerante" delle funzioni dal modulo STT
// Supporta:
// 1) export function transcribeAudio(bot, fileId)
// 2) export function transcribe(bot, fileId)
// 3) export default function (bot, fileId)
// 4) export default { transcribeAudio(){} } o { transcribe(){} }
// 5) export function whisperTranscribe(...)   (fallback comune)
// -----------------------------------------------------------------------------
function resolveTranscribe(mod) {
  if (mod && typeof mod.transcribeAudio === "function") return mod.transcribeAudio;
  if (mod && typeof mod.transcribe === "function") return mod.transcribe;
  if (mod && typeof mod.whisperTranscribe === "function") return mod.whisperTranscribe;
  if (mod && typeof mod.default === "function") return mod.default;
  if (mod && mod.default && typeof mod.default.transcribeAudio === "function")
    return mod.default.transcribeAudio;
  if (mod && mod.default && typeof mod.default.transcribe === "function")
    return mod.default.transcribe;
  if (mod && mod.default && typeof mod.default.whisperTranscribe === "function")
    return mod.default.whisperTranscribe;

  // Ultimo fallback: funzione che restituisce stringa vuota (non blocca il bot)
  return async () => "";
}

const rawTranscribe = resolveTranscribe(STT);

// Adattatore di chiamata: prova (bot,fileId) → (fileId) → ({bot,fileId})
async function callTranscribe(sttFn, botInstance, fileId) {
  try {
    // Preferiamo la firma (bot, fileId)
    if (sttFn.length >= 2) return await sttFn(botInstance, fileId);
    // Altrimenti solo fileId
    if (sttFn.length === 1) return await sttFn(fileId);
    // Altrimenti oggetto parametri
    return await sttFn({ bot: botInstance, fileId });
  } catch (err) {
    console.error("❌ STT call failed:", err);
    return "";
  }
}

// -----------------------------------------------------------------------------
// Risoluzione tollerante della funzione cuore (router messaggi)
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
    `⚠️ (fallback) Router cuore non trovato. Ricevuto: “${text}”.`;
}

const handleIrisMessage = resolveHandleIrisMessage(Heart);

// -----------------------------------------------------------------------------
// Prevenzione doppie risposte per lo stesso vocale
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
// VOICE HANDLER — unica risposta per vocale
// -----------------------------------------------------------------------------
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const fileId = msg.voice?.file_id;

  try {
    // Evita doppio trigger (voice + message) e resend rari
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
  if (msg.voice) return; // evita il doppio sui vocali

  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  if (!text) return; // ignora sticker/foto senza caption

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
