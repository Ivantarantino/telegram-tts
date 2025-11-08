// adapters/telegram_bot.js
// -------------------------------------------------------
// Adapter Telegram per IRIS (compatibile con index.js che importa bootstrapTelegram)
// - webhook su Render
// - chiama il cuore IRIS (irisHeartSpeak)
// - doppio paracadute contro messaggi vuoti (IRIS e Telegram)
// - log puliti
// -------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_MODE = "hy";

/**
 * Funzione che viene chiamata da index.js
 * (index.js fa: import { bootstrapTelegram } from "./adapters/telegram_bot.js";)
 */
export function bootstrapTelegram(app, publicUrl) {
  if (!TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN non impostato");
    return null;
  }

  // siamo in webhook (Render), quindi niente polling
  const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: { port: false } });

  const webhookUrl = `${publicUrl}/bot${TELEGRAM_TOKEN}`;
  bot.setWebHook(webhookUrl).then(() => {
    console.log(`🤖 Telegram Bot attivo in webhook su: ${webhookUrl}`);
  });

  // route express che riceve gli update Telegram
  app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // comandi
  bot.setMyCommands([
    { command: "/start", description: "Avvia IRIS" },
    { command: "/model", description: "Mostra la modalità attuale" }
  ]);
  console.log("✅ Comandi bot impostati (incluso /model visibile nel menu)");

  // handler principale
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();

    // /start
    if (text === "/start") {
      return safeSend(bot, chatId, "Ciao, sono IRIS. Dimmi pure. 🌿");
    }

    // /model
    if (text === "/model") {
      return safeSend(bot, chatId, `Modalità attuale: ${DEFAULT_MODE}`);
    }

    // niente testo? esci silenziosamente (evita 400)
    if (!text) {
      console.warn("⚠️ Update Telegram senza text, ignorato.");
      return;
    }

    try {
      // chiamiamo il cuore IRIS (alias compatibile)
      const irisReply = await irisHeartSpeak(text, { mode: DEFAULT_MODE });

      // estrai testo
      let replyText =
        (irisReply && irisReply.text && irisReply.text.trim()) || "";

      // paracadute: se IRIS fosse comunque vuota
      if (!replyText) {
        console.warn(
          "⚠️ IRIS ha restituito stringa vuota. Invio fallback di grazia."
        );
        replyText = "🌸 Silenzio fertile: il campo non ha ancora parlato.";
      }

      await safeSend(bot, chatId, replyText);
    } catch (err) {
      console.error("❌ Errore durante l'elaborazione IRIS → Telegram:", err?.message || err);
      await safeSend(
        bot,
        chatId,
        "Ho percepito la tua domanda ma il canale ha fatto rumore. Riprova. 🌸"
      );
    }
  });

  return bot;
}

/**
 * safeSend: manda messaggi a Telegram senza far esplodere log infiniti
 */
async function safeSend(bot, chatId, text) {
  let finalText = (text || "").trim();
  if (!finalText) {
    finalText = "🌸 (messaggio vuoto intercettato e sanato)";
  }

  try {
    await bot.sendMessage(chatId, finalText, {
      parse_mode: "Markdown"
    });
  } catch (err) {
    // qui NON stampiamo tutto l'oggetto di risposta di Telegram
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
