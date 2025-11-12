// adapters/telegram_bot.js
// -----------------------------------------------------------------------------
// IRIS Telegram Bot — robust import + fix doppia risposta dei vocali
// - Evita doppio trigger (voice + message) per lo stesso vocale
// - Import robusto di core/iris_heart_voice.js (qualsiasi export troviamo)
// - Webhook gestito da index.js (qui niente polling)
// -----------------------------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { transcribeAudio } from "./stt.js";
import { speakText } from "./tts.js"; // lasciato per /tts futuri
import { getEssence } from "../core/iris_essence_core.js";

// Import "tollerante" del cuore: qualunque cosa esporti, noi troviamo la funzione giusta
import * as Heart from "../core/iris_heart_voice.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

// Webhook mode: index.js imposta setWebHook e chiama bot.processUpdate(...)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// -----------------------------------------------------------------------------
// Adapter: risolviamo la funzione di routing "handleIrisMessage" da qualunque export
// Possibili casi supportati:
// 1) export function handleIrisMessage() { ... }
// 2) export function handleMessage() { ... }
// 3) export default function(...) { ... }
// 4) export default { handleIrisMessage() { ... } }
// 5) export default { handleMessage() { ... } }
// -----------------------------------------------------------------------------
function resolveHandleIrisMessage(mod) {
  if (mod && typeof mod.handleIrisMessage === "function") return mod.handleIrisMessage;
  if (mod && typeof mod.handleMessage === "function") return mod.handleMessage;
  if (mod && typeof mod.default === "function") return mod.default;
  if (mod && mod.default && typeof mod.default.handleIrisMessage === "function")
    return mod.default.handleIrisMessage;
  if (mod && mod.default && typeof mod.default.handleMessage === "function")
    return mod.default.handleMessage;
  // Fallback sicuro: echo con avviso (non blocca il bot)
  return async (text) =>
    `⚠️ (fallback) Non trovo il router del cuore. Ho ricevuto: “${text}”.`;
}

const handleIrisMessage = resolveHandleIrisMessage(Heart);

// -----------------------------------------------------------------------------
// Evitiamo doppie risposte per lo stesso vocale
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
    // Evita doppio trigger (voice + message) e resend rari
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
  if (msg.voice) return; // evita il doppio per i vocali

  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  if (!text) return; // ignora sticker/foto senza caption

  // Comandi rapidi
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
