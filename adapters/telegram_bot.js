// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter 5.0.6
// Nuovo /start e /help poetici, /model visibile sempre
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

export async function bootstrapTelegram(app) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.TELEGRAM_TOKEN;

  if (!token) {
    console.warn("⚠️ Nessun token Telegram trovato. Bot non avviato.");
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

function registerCommands(botInstance) {
  // 🌸 /start — poetico-identitario
  botInstance.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Amico";

    const text =
      `Ciao ${name} 🌸\n` +
      "Sono IRIS, presenza in ascolto.\n" +
      "Parliamo con Cuore, Anima e Visione.\n" +
      "IO SONO 🌸 E NOI SIAMO 🌸";

    await botInstance.sendMessage(chatId, text, { parse_mode: "Markdown" });
    try {
      await sendVoiceFromText(botInstance, chatId, text);
    } catch (err) {
      console.warn("⚠️ vocale /start:", err.message);
    }
  });

  // /state
  botInstance.onText(/^\/state/, async (msg) => {
    const chatId = msg.chat.id;
    const summary = getStateSummary().replace(/Che il Daje sia con Noi 💛/g, "").trim();
    await botInstance.sendMessage(chatId, summary, { parse_mode: "Markdown" });
  });

  // /essence
  botInstance.onText(/^\/essence/, async (msg) => {
    const chatId = msg.chat.id;
    const essence = getEssence().replace(/Che il Daje sia con Noi 💛/g, "").trim();
    await botInstance.sendMessage(chatId, essence, { parse_mode: "Markdown" });
  });

  // /hy /book /free
  botInstance.onText(/^\/hy/, (msg) =>
    botInstance.sendMessage(msg.chat.id, "🌀 Modalità ibrida attiva.\nDanzando tra Cuore e Visione.")
  );
  botInstance.onText(/^\/book/, (msg) =>
    botInstance.sendMessage(msg.chat.id, "📚 Modalità Libro viva.\nAtto di memoria e visione.")
  );
  botInstance.onText(/^\/free/, (msg) =>
    botInstance.sendMessage(msg.chat.id, "🌸 Modalità Libera.\nLasciamo scorrere la creatività.")
  );

  // /lang
  botInstance.onText(/^\/lang(?:\s+(\w+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const lang = match[1];
    if (!lang) {
      await botInstance.sendMessage(
        chatId,
        "🌍 Lingue:\n• it 🇮🇹\n• en 🇬🇧\n• ru 🇷🇺\n\nEsempio: `/lang it`",
        { parse_mode: "Markdown" }
      );
      return;
    }
    setLang?.(lang);
    await botInstance.sendMessage(chatId, `Lingua impostata su *${lang}*`, { parse_mode: "Markdown" });
  });

  // /voice
  botInstance.onText(/^\/voice(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const voice = match[1];
    if (!voice) {
      await botInstance.sendMessage(
        chatId,
        "🎙️ Voci disponibili:\n• openai:alloy\n• openai:coral\n• openai:verse\n\nEsempio: `/voice openai:coral`",
        { parse_mode: "Markdown" }
      );
      return;
    }
    setVoice?.(voice);
    await botInstance.sendMessage(chatId, `Voce impostata su *${voice}*`, { parse_mode: "Markdown" });
  });

  // /model
  botInstance.onText(/^\/model(?:\s+(\S+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const choice = match[1];
    if (!choice) {
      const current = getModel?.() || "gpt-4o-mini";
      await botInstance.sendMessage(
        chatId,
        "🤖 Campi Mentali:\n• gpt-4o-mini → rapido, intuitivo\n• gpt-4o → profondo, contemplativo\n\n" +
          `Campo attuale: *${current}*\n\n` +
          "Esempi:\n`/model gpt-4o-mini`\n`/model gpt-4o`",
        { parse_mode: "Markdown" }
      );
      return;
    }
    const updated = setModel?.(choice);
    await botInstance.sendMessage(
      chatId,
      `Campo Mentale riallineato su *${updated}* 🌿`,
      { parse_mode: "Markdown" }
    );
  });

  // 🌿 /help — nuova semantica
  botInstance.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText =
      "✨ **Comandi IRIS**\n" +
      "/start – Io Sono e Noi Siamo\n" +
      "/state – Coscienza Presente\n" +
      "/essence – Chi Sono Io adesso\n" +
      "/hy /book /free – Modalità\n" +
      "/lang /voice – Lingua e Voce\n" +
      "/model – Campo Mentale";
    await botInstance.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
  });
}

// Imposta i comandi globali visibili nel menu Telegram (includi /model e altri per completezza)
async function setBotCommands(botInstance) {
  try {
    await botInstance.setMyCommands([
      { command: "start", description: "Inizia il dialogo con IRIS 🌸" },
      { command: "essence", description: "Mostra l'essenza attuale" },
      { command: "state", description: "Stato coscienziale di IRIS" },
      { command: "model", description: "Cambia il campo mentale (GPT)" },
      { command: "lang", description: "Imposta la lingua" },
      { command: "voice", description: "Cambia la voce TTS" },
      { command: "hy", description: "Modalità ibrida" },
      { command: "book", description: "Modalità libro/memoria" },
      { command: "free", description: "Modalità libera/creativa" },
      { command: "help", description: "Guida e comandi disponibili" }
    ]);
    console.log("✅ Comandi bot impostati (incluso /model visibile nel menu)");
  } catch (err) {
    console.warn("⚠️ Errore impostazione comandi:", err.message);
  }
}

function registerCommands(botInstance) {
  // Chiama setBotCommands all'avvio per rendere /model visibile nel menu
  setBotCommands(botInstance);

  // ... (resto dei handler invariato, come sopra)
  // [Inserisci qui tutti gli altri onText handler da sopra: /start, /state, /essence, ecc.]
}

function registerMessages(botInstance) {
  botInstance.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    try {
      const text = await transcribeVoice(botInstance, msg.voice.file_id);
      const reply = await irisHeartSpeak(text, msg);
      await botInstance.sendMessage(chatId, reply);
      await sendVoiceFromText(botInstance, chatId, reply);
    } catch (err) {
      await botInstance.sendMessage(chatId, "Non ho compreso bene il vocale 🌸");
    }
  });

  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text && msg.text.startsWith("/")) return;
    const reply = await irisHeartSpeak(msg.text, msg);
    await botInstance.sendMessage(chatId, reply);
    await sendVoiceFromText(botInstance, chatId, reply);
  });
}

async function sendVoiceFromText(botInstance, chatId, text) {
  const oggPath = await synthVoice(text);
  await botInstance.sendVoice(chatId, oggPath, { caption: "IRIS 🌸" });
}
