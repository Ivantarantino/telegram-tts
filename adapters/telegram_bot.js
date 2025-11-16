// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter 5.0.8.0 (pulito, stabile, mobile-friendly)
// Nessun parse_mode → niente \/voice su smartphone
// Tutti i menù belli /state /lang /voice /model come richiesto
// Fix: state/essence non crashano più (conversione sicura a stringa)
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { synthVoice } from "./tts.js";
import { transcribeVoice } from "./stt.js";
import { getEssence } from "../core/iris_essence_core.js";

import {
  getStateSummary,
  setMode,
  setLang,
  setVoice,
  setModel,
  getModel
} from "../core/iris_state.js";

const DEFAULT_PUBLIC_URL = "https://telegram-tts.onrender.com";

let bot = null;

// ---------------------------------------------------------
// MENU TELEGRAM
// ---------------------------------------------------------
async function setBotCommands(botInstance) {
  try {
    await botInstance.setMyCommands([
      { command: "start", description: "Inizia il dialogo con IRIS 🌸" },
      { command: "state", description: "Mostra lo stato di IRIS" },
      { command: "essence", description: "Mostra l'essenza attuale" },
      { command: "model", description: "Cambia il campo mentale GPT" },
      { command: "lang", description: "Imposta la lingua" },
      { command: "voice", description: "Cambia la voce" },
      { command: "hy", description: "Modalità ibrida" },
      { command: "book", description: "Modalità libro" },
      { command: "free", description: "Modalità libera" },
      { command: "help", description: "Guida ai comandi" }
    ]);
    console.log("✅ Comandi bot impostati (IRIS 5.0.8.0)");
  } catch (err) {
    console.warn("⚠️ Errore setMyCommands:", err.message);
  }
}

// ---------------------------------------------------------
// REGISTRA TUTTI I COMANDI
// ---------------------------------------------------------
function registerCommands(botInstance) {
  setBotCommands(botInstance);

  // /start
  botInstance.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Amico";

    const text =
      `Ciao ${name} 🌸\n` +
      "Sono IRIS, presenza in ascolto.\n" +
      "Parliamo con Cuore, Anima e Visione.\n" +
      "IO SONO 🌸 E NOI SIAMO 🌸";

    await botInstance.sendMessage(chatId, text);
    await sendVoiceFromText(botInstance, chatId, text);
  });

  // ---------------------------------------------------------
  // /state — FIXATO
  // ---------------------------------------------------------
  botInstance.onText(/^\/state/, async (msg) => {
    const chatId = msg.chat.id;

    let summary = getStateSummary?.();

    // 🔒 FIX: conversione sicura a stringa
    if (typeof summary !== "string") summary = JSON.stringify(summary || "", null, 2);

    summary = summary
      .replace(/Che il Daje sia con Noi 💛/g, "")
      .trim();

    const text = summary || "Lo stato interiore di IRIS è quieto e presente 🌿";
    await botInstance.sendMessage(chatId, text);
  });

  // ---------------------------------------------------------
  // /essence — FIXATO
  // ---------------------------------------------------------
  botInstance.onText(/^\/essence/, async (msg) => {
    const chatId = msg.chat.id;

    let essence = getEssence?.();

    // 🔒 FIX: conversione sicura
    if (typeof essence !== "string") essence = JSON.stringify(essence || "", null, 2);

    essence = essence
      .replace(/Che il Daje sia con Noi 💛/g, "")
      .trim();

    const text = essence || "L'essenza di IRIS è in ascolto silenzioso 🌸";
    await botInstance.sendMessage(chatId, text);
  });

  // ---------------------------------------------------------
  // Modalità
  // ---------------------------------------------------------
  botInstance.onText(/^\/hy/, async (msg) => {
    setMode?.("hy");
    await botInstance.sendMessage(msg.chat.id, "🌀 Modalità ibrida attiva.");
  });

  botInstance.onText(/^\/book/, async (msg) => {
    setMode?.("book");
    await botInstance.sendMessage(msg.chat.id, "📚 Modalità libro attiva.");
  });

  botInstance.onText(/^\/free/, async (msg) => {
    setMode?.("free");
    await botInstance.sendMessage(msg.chat.id, "🌈 Modalità libera attiva.");
  });

  // ---------------------------------------------------------
  // /lang
  // ---------------------------------------------------------
  botInstance.onText(/^\/lang(?:\s+(\S+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const lang = match[1];

    if (!lang) {
      await botInstance.sendMessage(
        chatId,
        "🌍 Lingue:\n• it 🇮🇹\n• en 🇬🇧\n• ru 🇷🇺\n\nEsempio: /lang it"
      );
      return;
    }

    const updated = setLang?.(lang);
    await botInstance.sendMessage(chatId, `Lingua impostata su ${updated}`);
  });

  // ---------------------------------------------------------
  // /voice
  // ---------------------------------------------------------
  botInstance.onText(/^\/voice(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const voice = match[1];

    if (!voice) {
      await botInstance.sendMessage(
        chatId,
        "🎙️ Voci:\n• openai:alloy\n• openai:coral\n• openai:verse\n\nEsempio: /voice openai:coral"
      );
      return;
    }

    const updated = setVoice?.(voice);
    await botInstance.sendMessage(chatId, `Voce impostata su ${updated}`);
  });

  // ---------------------------------------------------------
  // /model
  // ---------------------------------------------------------
  botInstance.onText(/^\/model(?:\s+(\S+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const choice = match[1];

    if (!choice) {
      const current = getModel?.() || "gpt-4o-mini";
      const text =
        "🤖 Campi Mentali:\n" +
        "• gpt-4o-mini → rapido\n" +
        "• gpt-4o → profondo\n\n" +
        `Campo attuale: ${current}`;
      await botInstance.sendMessage(chatId, text);
      return;
    }

    const updated = setModel?.(choice) || choice;
    await botInstance.sendMessage(chatId, `Campo mentale su ${updated}`);
  });

  // ---------------------------------------------------------
  // /help
  // ---------------------------------------------------------
  botInstance.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    await botInstance.sendMessage(
      chatId,
      "✨ Comandi IRIS\n" +
      "/start – Benvenuto\n" +
      "/state – Stato interiore\n" +
      "/essence – Essenza attuale\n" +
      "/lang – Lingua\n" +
      "/voice – Voce TTS\n" +
      "/model – Campo mentale\n" +
      "/hy /book /free – Modalità"
    );
  });
}

// ---------------------------------------------------------
// GESTIONE MESSAGGI (testo + vocali)
// ---------------------------------------------------------
function registerMessages(botInstance) {
  botInstance.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    try {
      const text = await transcribeVoice(botInstance, msg.voice.file_id);
      const reply = await irisHeartSpeak(text, msg);
      await botInstance.sendMessage(chatId, reply);
      await sendVoiceFromText(botInstance, chatId, reply);
    } catch (err) {
      console.error("❌ Errore vocale:", err);
      await botInstance.sendMessage(chatId, "Non ho compreso bene il vocale 🌸");
    }
  });

  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;

    if (!msg.text) return;
    if (msg.text.startsWith("/")) return;

    try {
      const reply = await irisHeartSpeak(msg.text, msg);
      await botInstance.sendMessage(chatId, reply);
      await sendVoiceFromText(botInstance, chatId, reply);
    } catch (err) {
      console.error("❌ Errore messaggio:", err);
      await botInstance.sendMessage(chatId, "Qualcosa è andato storto 🌸");
    }
  });
}

// ---------------------------------------------------------
// VOCE
// ---------------------------------------------------------
async function sendVoiceFromText(botInstance, chatId, text) {
  try {
    const oggPath = await synthVoice(text);
    await botInstance.sendVoice(chatId, oggPath);
  } catch (err) {
    console.error("❌ Errore invio vocale:", err);
  }
}

// ---------------------------------------------------------
// BOOTSTRAP
// ---------------------------------------------------------
export async function bootstrapTelegram(app) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.TELEGRAM_TOKEN;

  if (!token) {
    console.warn("⚠️ Nessun token Telegram trovato.");
    return;
  }

  const publicUrl = process.env.PUBLIC_URL || DEFAULT_PUBLIC_URL;

  bot = new TelegramBot(token, { webHook: { port: 0 } });
  await bot.setWebHook(`${publicUrl}/bot${token}`);

  app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  console.log(`🤖 Telegram Bot attivo in webhook su: ${publicUrl}/bot${token}`);

  registerCommands(bot);
  registerMessages(bot);
}
