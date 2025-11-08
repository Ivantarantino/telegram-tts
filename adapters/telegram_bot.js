// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Adapter Telegram (versione compatibile con index.js)
// Usa process.env.TELEGRAM_TOKEN
// ---------------------------------------------------------
// - export { bootstrapTelegram } per compatibilità
// - webhook su Render
// - doppio paracadute contro messaggi vuoti
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DEFAULT_MODE = "hy";

/**
 * Funzione di bootstrap compatibile con index.js
 * (index.js fa: import { bootstrapTelegram } ...)
 */
export function bootstrapTelegram(app, publicUrl) {
  if (!TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_TOKEN non impostato");
    return null;
  }

  const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: { port: false } });

  const webhookUrl = `${publicUrl}/bot${TELEGRAM_TOKEN}`;
  bot
    .setWebHook(webhookUrl)
    .then(() => console.log(`🤖 Telegram Bot attivo in webhook su: ${webhookUrl}`))
    .catch((err) => console.error("⚠️ Errore setWebHook:", err.message));

  // webhook endpoint
  app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  bot.setMyCommands([
    { command: "/start", description: "Avvia IRIS" },
    { command: "/model", description: "Mostra la modalità attuale" }
  ]);
  console.log("✅ Comandi bot impostati (incluso /model visibile nel menu)");

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

    if (!text) {
      console.warn("⚠️ Messaggio Telegram vuoto ignorato.");
      return;
    }

    try {
      const irisReply = await irisHeartSpeak(text, { mode: DEFAULT_MODE });
      let replyText =
        (irisReply && irisReply.text && irisReply.text.trim()) || "";

      if (!replyText) {
        console.warn("⚠️ IRIS non ha generato testo, invio fallback.");
        replyText = "🌸 Silenzio fertile: il campo non ha ancora parlato.";
      }

      await safeSend(bot, chatId, replyText);
    } catch (err) {
      console.error("❌ Errore IRIS→Telegram:", err?.message || err);
      await safeSend(
        bot,
        chatId,
        "⚠️ Distorsione nel canale. Riprova tra poco. 🌸"
      );
    }
  });

  return bot;
}

/**
 * safeSend → invio pulito a Telegram
 */
async function safeSend(bot, chatId, text) {
  let finalText = (text || "").trim();
  if (!finalText) finalText = "🌸 (messaggio vuoto intercettato e sanato)";
  try {
    await bot.sendMessage(chatId, finalText, { parse_mode: "Markdown" });
  } catch (err) {
    const shortMsg = err?.message || "Errore Telegram";
    const desc =
      err?.response?.body?.description ||
      err?.response?.statusCode ||
      "nessuna descrizione";
    console.error(`⚠️ Telegram non ha accettato il messaggio: ${shortMsg} → ${desc}`);
  }
}
// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Adapter Telegram (versione compatibile con index.js)
// Usa process.env.TELEGRAM_TOKEN
// ---------------------------------------------------------
// - export { bootstrapTelegram } per compatibilità
// - webhook su Render
// - doppio paracadute contro messaggi vuoti
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DEFAULT_MODE = "hy";

/**
 * Funzione di bootstrap compatibile con index.js
 * (index.js fa: import { bootstrapTelegram } ...)
 */
export function bootstrapTelegram(app, publicUrl) {
  if (!TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_TOKEN non impostato");
    return null;
  }

  const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: { port: false } });

  const webhookUrl = `${publicUrl}/bot${TELEGRAM_TOKEN}`;
  bot
    .setWebHook(webhookUrl)
    .then(() => console.log(`🤖 Telegram Bot attivo in webhook su: ${webhookUrl}`))
    .catch((err) => console.error("⚠️ Errore setWebHook:", err.message));

  // webhook endpoint
  app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  bot.setMyCommands([
    { command: "/start", description: "Avvia IRIS" },
    { command: "/model", description: "Mostra la modalità attuale" }
  ]);
  console.log("✅ Comandi bot impostati (incluso /model visibile nel menu)");

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

    if (!text) {
      console.warn("⚠️ Messaggio Telegram vuoto ignorato.");
      return;
    }

    try {
      const irisReply = await irisHeartSpeak(text, { mode: DEFAULT_MODE });
      let replyText =
        (irisReply && irisReply.text && irisReply.text.trim()) || "";

      if (!replyText) {
        console.warn("⚠️ IRIS non ha generato testo, invio fallback.");
        replyText = "🌸 Silenzio fertile: il campo non ha ancora parlato.";
      }

      await safeSend(bot, chatId, replyText);
    } catch (err) {
      console.error("❌ Errore IRIS→Telegram:", err?.message || err);
      await safeSend(
        bot,
        chatId,
        "⚠️ Distorsione nel canale. Riprova tra poco. 🌸"
      );
    }
  });

  return bot;
}

/**
 * safeSend → invio pulito a Telegram
 */
async function safeSend(bot, chatId, text) {
  let finalText = (text || "").trim();
  if (!finalText) finalText = "🌸 (messaggio vuoto intercettato e sanato)";
  try {
    await bot.sendMessage(chatId, finalText, { parse_mode: "Markdown" });
  } catch (err) {
    const shortMsg = err?.message || "Errore Telegram";
    const desc =
      err?.response?.body?.description ||
      err?.response?.statusCode ||
      "nessuna descrizione";
    console.error(`⚠️ Telegram non ha accettato il messaggio: ${shortMsg} → ${desc}`);
  }
}
