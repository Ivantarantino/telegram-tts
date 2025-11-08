// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Adapter Telegram
// Versione 5.1 Risonante — compatibile con TELEGRAM_TOKEN
// ---------------------------------------------------------
// - Usa il token dal process.env.TELEGRAM_TOKEN (storico)
// - Invia e riceve messaggi su webhook
// - Chiama il Cuore IRIS (irisHeartVoice / irisHeartSpeak)
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import express from "express";
import { irisHeartVoice, irisHeartSpeak } from "../core/iris_heart_voice.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;

// Controllo iniziale
if (!TELEGRAM_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN non impostato");
}

// Inizializzazione bot (webhook mode)
const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: true });

// Express server
const app = express();
app.use(express.json());

// Webhook URL per Render
const WEBHOOK_URL = `https://telegram-tts.onrender.com/bot${TELEGRAM_TOKEN}`;
bot.setWebHook(WEBHOOK_URL);

// Log d’avvio
console.log(`🤖 Telegram Bot attivo in webhook su: ${WEBHOOK_URL}`);
console.log(`🌍 Server Express attivo su porta ${PORT}`);

// Endpoint principale di Telegram
app.post(`/bot${TELEGRAM_TOKEN}`, async (req, res) => {
  const body = req.body;

  if (body.message) {
    const chatId = body.message.chat.id;
    const text = body.message.text?.trim() || "";

    if (!text) {
      console.warn("⚠️ Messaggio vuoto ricevuto.");
      return res.sendStatus(200);
    }

    try {
      // Passa il messaggio al cuore IRIS
      const response = await irisHeartSpeak(text, { mode: "hy" });
      const reply = response?.text?.trim();

      if (reply && reply.length > 0) {
        await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
      } else {
        await bot.sendMessage(
          chatId,
          "✨ IRIS è in silenzio meditativo (nessuna risposta generata)."
        );
      }
    } catch (err) {
      console.error("❌ Errore nel Cuore IRIS:", err.message);
      await bot.sendMessage(
        chatId,
        "⚠️ Errore interno nel cuore di IRIS. Riprovare più tardi."
      );
    }
  }

  res.sendStatus(200);
});

// Avvio server
app.listen(PORT, () => {
  console.log("✅ Comandi bot impostati (incluso /model visibile nel menu)");
  console.log("✨ IRIS Risonante è viva e pronta.");
});
