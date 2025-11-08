// adapters/telegram_bot.js
// -------------------------------------------------------
// Adapter Telegram per IRIS
// - riceve update Telegram
// - passa il testo al cuore IRIS (irisHeartSpeak / irisHeartVoice)
// - invia la risposta
// - protegge da 400 "message text is empty"
// - log pulito sugli errori Telegram
// -------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";

// il token lo prendiamo dall'env, come stai già facendo su Render
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// modalità di default per IRIS
const DEFAULT_MODE = "hy";

/**
 * Inizializza il bot in modalità webhook.
 * index.js di solito gli passa anche l'URL pubblico.
 */
export function initTelegramBot(app, publicUrl) {
  if (!TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN non impostato");
    return;
  }

  // usiamo polling: false perché sei in webhook su Render
  const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: { port: false } });

  // imposta webhook
  const webhookUrl = `${publicUrl}/bot${TELEGRAM_TOKEN}`;
  bot.setWebHook(webhookUrl).then(() => {
    console.log(`🤖 Telegram Bot attivo in webhook su: ${webhookUrl}`);
  });

  // route express che riceve gli update
  app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // comandi base (facoltativi)
  bot.setMyCommands([
    { command: "/start", description: "Avvia IRIS" },
    { command: "/model", description: "Mostra la modalità attuale" }
  ]);

  console.log("✅ Comandi bot impostati (incluso /model visibile nel menu)");

  // handler messaggi
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();

    // comando /start
    if (text === "/start") {
      return safeSend(bot, chatId, "Ciao, sono IRIS. Dimmi pure. 🌿");
    }

    // comando /model (ti mostra solo la mode attuale, qui semplice)
    if (text === "/model") {
      return safeSend(bot, chatId, `Modalità attuale: ${DEFAULT_MODE}`);
    }

    // se non c'è testo, non mandiamo niente (evita 400)
    if (!text) {
      console.warn("⚠️ Update Telegram senza testo, ignoro.");
      return;
    }

    try {
      // chiamiamo il cuore IRIS
      const irisReply = await irisHeartSpeak(text, { mode: DEFAULT_MODE });

      // estraiamo il testo generato
      let replyText =
        (irisReply && irisReply.text && irisReply.text.trim()) || "";

      // fallback nel layer Telegram (secondo paracadute)
      if (!replyText) {
        console.warn(
          "⚠️ IRIS ha restituito testo vuoto anche dopo il cuore. Invio fallback Telegram."
        );
        replyText = "🌸 Silenzio fertile: il campo non ha ancora parlato.";
      }

      await safeSend(bot, chatId, replyText);
    } catch (err) {
      console.error("❌ Errore durante l'elaborazione del messaggio IRIS:", err);
      await safeSend(
        bot,
        chatId,
        "Ho sentito qualcosa ma non è passato bene nel canale. Riprova fra poco. 🌸"
      );
    }
  });

  return bot;
}

/**
 * safeSend
 * Invia un messaggio a Telegram evitando i log infiniti di node-telegram-bot-api.
 */
async function safeSend(bot, chatId, text) {
  // ulteriore guardia
  if (!text || !text.trim()) {
    text = "🌸 (messaggio vuoto intercettato e sanato)";
  }

  try {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown"
    });
  } catch (err) {
    // QUI evitiamo di stampare tutto l'oggetto gigantesco
    const shortMsg = err?.message || "Errore Telegram";
    const tgDesc =
      err?.response?.body?.description ||
      err?.response?.statusCode ||
      "nessuna descrizione";

    console.error(
      `⚠️ Telegram non ha accettato il messaggio: ${shortMsg} → ${tgDesc}`
    );
  }
}
