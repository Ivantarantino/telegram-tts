// adapters/telegram_bot.js
// -----------------------------------------------------------------------------
// IRIS Telegram Bot — fix doppia risposta su vocali
// - Evita doppio trigger (voice + message) per lo stesso vocale
// - Ignora i messaggi 'message' che contengono 'voice'
// - Compatibile con 5.0.8.0, webhook gestito da index.js
// -----------------------------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { transcribeAudio } from "./stt.js";
import { speakText } from "./tts.js"; // lasciato per compatibilità futura /tts
import { getEssence } from "../core/iris_essence_core.js";
import { handleIrisMessage } from "../core/iris_heart_voice.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

// Creiamo il bot senza polling: il webhook è gestito da index.js
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// Set per evitare doppi trigger sullo stesso vocale
const recentVoiceMessages = new Set();
const VOICE_CACHE_TTL_MS = 8000;

/**
 * Helper: safeSend
 */
async function safeSend(chatId, text, options = {}) {
  try {
    return await bot.sendMessage(chatId, text, options);
  } catch (err) {
    console.error("❌ Telegram sendMessage error:", err);
  }
}

/**
 * VOICE HANDLER
 * - Trascrive con Whisper
 * - Previene doppia risposta usando message_id come chiave
 */
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const fileId = msg.voice?.file_id;

  try {
    // Evita doppio trigger se per qualche motivo Telegram re-invia lo stesso update
    if (recentVoiceMessages.has(messageId)) return;
    recentVoiceMessages.add(messageId);
    setTimeout(() => recentVoiceMessages.delete(messageId), VOICE_CACHE_TTL_MS);

    if (!fileId) {
      await safeSend(chatId, "Non ricevo il file vocale. Puoi ripetere, per favore? 🌿");
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

/**
 * MESSAGE HANDLER
 * - Ignora messaggi che includono voce (già gestiti da 'voice')
 * - Gestisce comandi e testo
 */
bot.on("message", async (msg) => {
  // Ignora se è un vocale: verrà già servito dall'handler 'voice'
  if (msg.voice) return;

  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // Niente testo? (es. sticker, foto senza caption)
  if (!text) return;

  // Comandi custom
  if (text.startsWith("/essence")) {
    const reply = await getEssence();
    await safeSend(chatId, reply);
    return;
  }

  // Fallback: normale routing IRIS
  try {
    const reply = await handleIrisMessage(text, msg);
    await safeSend(chatId, reply);
  } catch (err) {
    console.error("❌ Errore handleIrisMessage:", err);
    await safeSend(chatId, "C'è un piccolo nodo nel flusso. Riproviamo tra un respiro. 🌿");
  }
});

export default bot;
