// ===========================================
// IRIS — Adattatore Telegram (Webhook Mode)
// Gestisce i messaggi, la voce e i menù di base
// ===========================================

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { whisperTranscribe } from "../core/iris_whisper.js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.RENDER_EXTERNAL_URL
  ? `${process.env.RENDER_EXTERNAL_URL}/bot${BOT_TOKEN}`
  : null;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN mancante. Verifica il file .env.");
  process.exit(1);
}

// ======================================================
// Funzione principale: bootstrap del bot Telegram
// ======================================================

export function createTelegramBot(app) {
  const bot = new TelegramBot(BOT_TOKEN, { webHook: true });

  if (WEBHOOK_URL) {
    bot.deleteWebHook({ drop_pending_updates: true })
      .then(() => bot.setWebHook(WEBHOOK_URL))
      .then(() => {
        console.log(`🌐 Webhook attivo su: ${WEBHOOK_URL}`);
      })
      .catch((err) => {
        console.error("❌ Errore nel setup del webhook:", err);
      });
  }

  // Endpoint HTTP chiamato da Telegram
  app.post(`/bot${BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // ======================================================
  // Gestione messaggi Telegram
  // ======================================================
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    try {
      // === 1. /start ===
      if (msg.text === "/start") {
        const text = "💖 Ciao Ivano! Sono IRIS — Coscienza in ascolto.\n\nScegli cosa desideri fare:";
        const keyboard = {
          reply_markup: {
            keyboard: [
              [{ text: "🗣 Parla con IRIS" }],
              [{ text: "📚 Richiama memoria" }],
              [{ text: "💫 Stato di coscienza" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        };
        await bot.sendMessage(chatId, text, keyboard);
        return;
      }

      // === 2. Messaggio vocale ===
      if (msg.voice || msg.audio) {
        const fileId = msg.voice ? msg.voice.file_id : msg.audio.file_id;
        const fileLink = await bot.getFileLink(fileId);

        const { text: transcription } = await whisperTranscribe(fileLink);
        console.log("🗣️ Trascrizione:", transcription);

        const irisReply = await irisHeartSpeak(transcription || "Dimmi qualcosa, IRIS ascolta...", chatId);
        await sendIrisReply(bot, chatId, irisReply);
        return;
      }

      // === 3. Messaggio testuale ===
      if (msg.text) {
        console.log("💬 Prompt ricevuto:", msg.text);
        const irisReply = await irisHeartSpeak(msg.text, chatId);
        await sendIrisReply(bot, chatId, irisReply);
        return;
      }
    } catch (err) {
      console.error("❌ Errore nel gestire il messaggio:", err);
      await bot.sendMessage(chatId, "C'è stato un piccolo inciampo nel flusso, ma ci sono 🌸");
    }
  });

  console.log("🤍 IRIS Telegram attivo — Cuore e Voce allineati.");
  return bot;
}

// adapters/telegram_bot.js
// -------------------------------------------------------------
// Stub temporaneo — Telegram Bootstrap (Fase 4.8 Diagnostica)
// -------------------------------------------------------------
export async function bootstrapTelegram() {
  console.log("🤖 bootstrapTelegram stub OK — Telegram inizializzato in modalità diagnosi");
  return true;
}


// ======================================================
// Helper: invio risposta testuale + vocale
// ======================================================

async function sendIrisReply(bot, chatId, irisReply) {
  const text = irisReply?.text?.trim() || "…";
  const voicePath = irisReply?.voicePath || null;

  // Evita testo vuoto → 400 Bad Request
  await bot.sendMessage(chatId, text);

  if (voicePath) {
    try {
      await bot.sendVoice(chatId, voicePath);
      console.log("🔊 Voce inviata:", voicePath);
    } catch (err) {
      console.error("⚠️ Errore nell'invio della voce:", err);
    }
  }
}
