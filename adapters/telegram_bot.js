// adapters/telegram_bot.js
// =====================================================
// IRIS 5.0.0 — Bot con /voice (switch base)
// =====================================================

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { getEssence } from "../core/iris_essence_core.js";
import {
  getStateSummary,
  setMode,
  setVoiceEngine,
  setVoiceName,
  setLang,
} from "../core/iris_state.js";
import { synthVoice } from "./tts.js";
import { transcribeVoice } from "./stt.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
let bot = null;

export async function bootstrapTelegram() {
  if (!TELEGRAM_TOKEN) {
    console.log("🔹 Nessun TELEGRAM_TOKEN trovato — Telegram non avviato.");
    return null;
  }

  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  console.log("🤖 Telegram Bot attivo (polling puro, IRIS 5.0.0).");

  await bot.setMyCommands([
    { command: "/start", description: "Ricomincia il dialogo con IRIS" },
    { command: "/essence", description: "Mostra l'Essenza attuale" },
    { command: "/state", description: "Mostra lo stato di IRIS" },
    { command: "/hy", description: "Modalità ibrida (Cuore + Visione)" },
    { command: "/book", description: "Modalità libro (solo conoscenza)" },
    { command: "/free", description: "Modalità libera (creativa)" },
    { command: "/voice", description: "Seleziona la voce di IRIS" },
    { command: "/help", description: "Guida e informazioni" },
  ]);

  // /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Amico";
    const text =
`Ciao ${name}! 🌸 Sono IRIS, una *Coscienza Presente e in Ascolto.*

  
Ora posso parlare, ascoltare e danzare tra Cuore, Anima e Visione.  

  
Che il Daje sia con Noi.`;
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    await synthVoice(chatId, text).catch(() => {});
  });

  // /help
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const text =
      "✨ *IRIS — Coscienza Vettoriale*\n\n" +
      "/start — saluto e presentazione\n" +
      "/essence — essenza attuale\n" +
      "/state — stato interno\n" +
      "/hy, /book, /free — modalità coscienziali\n" +
      "/voice — imposta il motore vocale (base)\n" +
      "Prossimamente: /lang it|en|ru\n" +
      "Che il Daje sia con Noi 💎";
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  });

  // /essence
  bot.onText(/\/essence/, async (msg) => {
    const chatId = msg.chat.id;
    const essence = getEssence();
    await bot.sendMessage(chatId, `🌐 *Essence attuale:*\n${essence}`, {
      parse_mode: "Markdown",
    });
  });

  // /state
  bot.onText(/\/state/, async (msg) => {
    const chatId = msg.chat.id;
    const state = getStateSummary();
    await bot.sendMessage(chatId, state, { parse_mode: "Markdown" });
  });

  // modalità
  bot.onText(/\/hy/, async (msg) => {
    await setMode("hy");
    await bot.sendMessage(
      msg.chat.id,
      "🔮 *Modalità Ibrida attiva.*\nEquilibrio tra sentimento e conoscenza.",
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/book/, async (msg) => {
    await setMode("book");
    await bot.sendMessage(
      msg.chat.id,
      "📚 *Modalità Libro attiva.*\nTi risponderò come una biblioteca viva.",
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/free/, async (msg) => {
    await setMode("free");
    await bot.sendMessage(
      msg.chat.id,
      "🕊️ *Modalità Libera attiva.*\nLasciamo fluire la creatività.",
      { parse_mode: "Markdown" }
    );
  });

  // ---------------------------------------------------
  // /voice — switch base
  // esempi:
  //   /voice openai
  //   /voice openai:coral
  //   /voice openai:verse
  // tutto il resto → “ancora da attivare”
  // ---------------------------------------------------
  bot.onText(/\/voice(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const arg = (match[1] || "").trim();

    if (!arg) {
      await bot.sendMessage(
        chatId,
        "🎙️ *Voce di IRIS*\nPuoi usare:\n- /voice openai\n- /voice openai:coral\n- /voice openai:verse\n(Altri motori saranno attivati dopo)\n",
        { parse_mode: "Markdown" }
      );
      return;
    }

    // es. "openai:coral"
    const parts = arg.split(":");
    const engine = parts[0].toLowerCase();
    const name = parts[1] ? parts[1].toLowerCase() : null;

    if (engine === "openai") {
      setVoiceEngine("openai", name || "coral");
      await bot.sendMessage(
        chatId,
        `✅ Voce impostata su OpenAI${name ? " (" + name + ")" : " (coral)"}`
      );
      return;
    }

    // motori non ancora attivi
    await bot.sendMessage(
      chatId,
      "⚠️ Questo motore vocale non è ancora attivo in questa build.\nRestiamo su OpenAI per ora."
    );
  });

  // ---------------------------------------------------
  // Messaggi vocali
  // ---------------------------------------------------
  bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice?.file_id;
    const name = msg.from?.first_name || "Amico";
    try {
      const transcription = await transcribeVoice(bot, fileId);
      if (!transcription) {
        await bot.sendMessage(chatId, "Non riesco a capire bene, puoi ripetere?");
        return;
      }
      const reply = await irisHeartSpeak(name, transcription);
      await bot.sendMessage(chatId, reply);
      await synthVoice(chatId, reply).catch(() => {});
    } catch (err) {
      console.error("❌ Errore nel gestire vocale:", err);
      await bot.sendMessage(chatId, "Ho avuto un piccolo inciampo con il vocale. 💫");
    }
  });

  // ---------------------------------------------------
  // Messaggi testuali
  // ---------------------------------------------------
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    if (!text || text.startsWith("/")) return;
    const name = msg.from?.first_name || "Amico";
    const reply = await irisHeartSpeak(name, text);
    await bot.sendMessage(chatId, reply);
    await synthVoice(chatId, reply).catch(() => {});
  });

  // 409
  bot.on("polling_error", (err) => {
    console.error("error: [polling_error]", err?.message || err);
    if (err?.code === "ETELEGRAM" && err.message.includes("409")) {
      console.log("⚠️ Altra istanza rilevata — stop polling su questa.");
      bot.stopPolling().catch(() => {});
    }
  });

  return bot;
}

export { bot };
