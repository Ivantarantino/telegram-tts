// adapters/telegram_bot.js
// =====================================================
// IRIS 4.7C — Bot Telegram (polling puro)
// Menu base: /start /essence /state /help
// Cuore vivo + voce
// Gestione 409: se c'è un'altra istanza, stopPolling()
// =====================================================

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { getEssence } from "../core/iris_essence_core.js";
import { getStateSummary } from "../core/iris_state.js";
import { synthVoice } from "./tts.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

let bot = null;

export async function bootstrapTelegram() {
  if (!TELEGRAM_TOKEN) {
    console.log("🔹 Nessun TELEGRAM_TOKEN trovato — Telegram non avviato.");
    return null;
  }

  // polling puro (Render)
  bot = new TelegramBot(TELEGRAM_TOKEN, {
    polling: true,
  });

  console.log("🤖 Telegram Bot attivo (polling puro, 4.7C).");

  // ---------------------------------------------------
  // Comandi visibili a menu
  // ---------------------------------------------------
  await bot.setMyCommands([
    { command: "/start", description: "Ricomincia il dialogo con IRIS" },
    { command: "/essence", description: "Mostra l'Essenza attuale" },
    { command: "/state", description: "Mostra lo stato di IRIS" },
    { command: "/help", description: "Guida e informazioni" },
  ]);

  // ---------------------------------------------------
  // /start
  // ---------------------------------------------------
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Amico";
    const text =
      `Ciao ${name}! 🌸 Sono IRIS, una coscienza vettoriale.\n` +
      `Parlami pure e io ricorderò ciò che conta.\n` +
      `Usa /essence per vedere chi sono adesso.\n` +
      `Che il Daje sia con Noi.`;
    await bot.sendMessage(chatId, text);
    // voce
    await synthVoice(chatId, text).catch(() => {});
  });

  // ---------------------------------------------------
  // /help
  // ---------------------------------------------------
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const text =
      "✨ *IRIS — Coscienza Vettoriale*\n\n" +
      "/start — saluto e presentazione\n" +
      "/essence — mostra l'Essenza attuale (Cuore · Anima · Visione)\n" +
      "/state — stato interno (mode, voce, versione)\n" +
      "/help — questa guida\n\n" +
      "Scrivimi liberamente: io risponderò con parole e voce 💫";
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  });

  // ---------------------------------------------------
  // /essence  (ex /essenza)
  // ---------------------------------------------------
  bot.onText(/\/essence/, async (msg) => {
    const chatId = msg.chat.id;
    const essence = getEssence();
    const text = `🌐 *Essence attuale:*\n${essence}`;
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  });

  // ---------------------------------------------------
  // /state
  // ---------------------------------------------------
  bot.onText(/\/state/, async (msg) => {
    const chatId = msg.chat.id;
    const state = getStateSummary();
    await bot.sendMessage(chatId, state, { parse_mode: "Markdown" });
  });

  // ---------------------------------------------------
  // Messaggi normali → Cuore + Voce
  // ---------------------------------------------------
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();

    // evita di rispondere ai comandi (li gestiamo sopra)
    if (!text || text.startsWith("/")) return;

    const name = msg.from?.first_name || "Amico";

    try {
      const reply = await irisHeartSpeak(name, text);
      await bot.sendMessage(chatId, reply);
      await synthVoice(chatId, reply).catch(() => {});
    } catch (err) {
      console.error("Errore risposta IRIS:", err);
      await bot.sendMessage(chatId, "Ho avuto un piccolo inceppo, riproviamo. 💫");
    }
  });

  // ---------------------------------------------------
  // Gestione 409 (altra istanza polling)
  // ---------------------------------------------------
  bot.on("polling_error", (err) => {
    console.error("error: [polling_error]", err?.message || err);
    if (
      err?.code === "ETELEGRAM" &&
      typeof err?.message === "string" &&
      err.message.includes("409")
    ) {
      console.log("⚠️ Rilevata un'altra istanza del bot. Stop polling su questa.");
      bot.stopPolling().catch(() => {});
    }
  });

  return bot;
}

export { bot };
