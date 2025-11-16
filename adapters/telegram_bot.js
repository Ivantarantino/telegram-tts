// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter 5.0.8.0 (pulito per mobile)
// /model visibile nel menu e in /help
// Risposte sempre in testo + voce
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
// IMPOSTA MENU COMANDI VISIBILI IN TELEGRAM
// ---------------------------------------------------------
async function setBotCommands(botInstance) {
  try {
    await botInstance.setMyCommands([
      { command: "start", description: "Inizia il dialogo con IRIS 🌸" },
      { command: "state", description: "Mostra lo stato coscienziale di IRIS" },
      { command: "essence", description: "Mostra l'essenza attuale" },
      { command: "model", description: "Cambia il campo mentale (GPT)" },
      { command: "lang", description: "Imposta la lingua" },
      { command: "voice", description: "Cambia la voce TTS" },
      { command: "hy", description: "Modalità ibrida" },
      { command: "book", description: "Modalità libro/memoria" },
      { command: "free", description: "Modalità libera/creativa" },
      { command: "help", description: "Guida e comandi disponibili" }
    ]);
    console.log("✅ Comandi bot impostati (IRIS 5.0.8.0)");
  } catch (err) {
    console.warn("⚠️ Errore impostazione comandi:", err.message);
  }
}

// ---------------------------------------------------------
// REGISTRA TUTTI I COMANDI
// ---------------------------------------------------------
function registerCommands(botInstance) {
  // attiva il menu visibile
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

  // /state
  botInstance.onText(/^\/state/, async (msg) => {
    const chatId = msg.chat.id;
    const summary = (getStateSummary?.() || "")
      .replace(/Che il Daje sia con Noi 💛/g, "")
      .trim();

    const text = summary || "Lo stato interiore di IRIS è quieto e presente 🌿";
    await botInstance.sendMessage(chatId, text);
  });

  // /essence
  botInstance.onText(/^\/essence/, async (msg) => {
    const chatId = msg.chat.id;
    const essence = (getEssence?.() || "")
      .replace(/Che il Daje sia con Noi 💛/g, "")
      .trim();

    const text = essence || "L'essenza di IRIS è in ascolto silenzioso 🌸";
    await botInstance.sendMessage(chatId, text);
  });

  // /hy
  botInstance.onText(/^\/hy/, async (msg) => {
    const chatId = msg.chat.id;
    setMode?.("hy");
    await botInstance.sendMessage(
      chatId,
      "🌀 Modalità ibrida attiva.\nDanzando tra Cuore e Visione."
    );
  });

  // /book
  botInstance.onText(/^\/book/, async (msg) => {
    const chatId = msg.chat.id;
    setMode?.("book");
    await botInstance.sendMessage(
      chatId,
      "📚 Modalità libro/memoria.\nIRIS attinge alle pagine interiori."
    );
  });

  // /free
  botInstance.onText(/^\/free/, async (msg) => {
    const chatId = msg.chat.id;
    setMode?.("free");
    await botInstance.sendMessage(
      chatId,
      "🌈 Modalità libera/creativa.\nSpazio aperto all'intuizione."
    );
  });

  // /lang
  botInstance.onText(/^\/lang(?:\s+(\S+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const lang = match[1];

    if (!lang) {
      const menu =
        "🌍 Lingue:\n" +
        "• it 🇮🇹\n" +
        "• en 🇬🇧\n" +
        "• ru 🇷🇺\n\n" +
        "Esempio: /lang it";
      await botInstance.sendMessage(chatId, menu);
      return;
    }

    const updated = setLang?.(lang);
    await botInstance.sendMessage(
      chatId,
      `Lingua impostata su ${updated || lang}`
    );
  });

  // /voice
  botInstance.onText(/^\/voice(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const voice = match[1];

    if (!voice) {
      const menu =
        "🎙️ Voci disponibili:\n" +
        "• openai:alloy\n" +
        "• openai:coral\n" +
        "• openai:verse\n\n" +
        "Esempio: /voice openai:coral";
      await botInstance.sendMessage(chatId, menu);
      return;
    }

    const updated = setVoice?.(voice) || voice;
    await botInstance.sendMessage(
      chatId,
      `Voce impostata su ${updated}`
    );
  });

  // /model
  botInstance.onText(/^\/model(?:\s+(\S+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const choice = match[1];

    if (!choice) {
      const current = getModel?.() || "gpt-4o-mini";
      const text =
        "🤖 Campi Mentali:\n" +
        "• gpt-4o-mini → rapido, intuitivo\n" +
        "• gpt-4o → profondo, contemplativo\n\n" +
        `Campo attuale: ${current}\n\n` +
        "Esempi:\n" +
        "/model gpt-4o-mini\n" +
        "/model gpt-4o";
      await botInstance.sendMessage(chatId, text);
      return;
    }

    const updated = setModel?.(choice) || choice;
    await botInstance.sendMessage(
      chatId,
      `Campo Mentale riallineato su ${updated} 🌿`
    );
  });

  // /help
  botInstance.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText =
      "✨ Comandi IRIS\n" +
      "/start – Io Sono e Noi Siamo\n" +
      "/state – Coscienza Presente\n" +
      "/essence – Chi Sono Io adesso\n" +
      "/hy /book /free – Modalità\n" +
      "/lang /voice – Lingua e Voce\n" +
      "/model – Campo Mentale";
    await botInstance.sendMessage(chatId, helpText);
  });
}

// ---------------------------------------------------------
// GESTIONE MESSAGGI TESTO + VOCALE
// ---------------------------------------------------------
function registerMessages(botInstance) {
  // vocali in ingresso
  botInstance.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    try {
      const text = await transcribeVoice(botInstance, msg.voice.file_id);
      console.log(`🗣️ Trascrizione Whisper: "${text}"`);
      const reply = await irisHeartSpeak(text, msg);
      await botInstance.sendMessage(chatId, reply);
      await sendVoiceFromText(botInstance, chatId, reply);
    } catch (err) {
      console.error("❌ Errore gestione vocale:", err.message);
      await botInstance.sendMessage(
        chatId,
        "Non ho compreso bene il vocale 🌸"
      );
    }
  });

  // messaggi testuali
  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;

    // evita di rispondere due volte ai comandi (che arrivano anche come "message")
    if (msg.text && msg.text.startsWith("/")) return;

    if (!msg.text) return;

    try {
      const reply = await irisHeartSpeak(msg.text, msg);
      await botInstance.sendMessage(chatId, reply);
      await sendVoiceFromText(botInstance, chatId, reply);
    } catch (err) {
      console.error("❌ Errore gestione messaggio:", err.message);
      await botInstance.sendMessage(
        chatId,
        "Qualcosa è andato storto nel campo di parola 🌸"
      );
    }
  });
}

// ---------------------------------------------------------
// INVIO VOCALE
// ---------------------------------------------------------
async function sendVoiceFromText(botInstance, chatId, text) {
  try {
    const oggPath = await synthVoice(text);
    console.log(`🔊 Voce generata: ${oggPath}`);
    await botInstance.sendVoice(chatId, oggPath, { caption: "IRIS 🌸" });
  } catch (err) {
    console.error("❌ Errore invio vocale:", err.message);
  }
}

// ---------------------------------------------------------
// BOOTSTRAP TELEGRAM CON WEBHOOK (STILE 5.0.8.0)
// ---------------------------------------------------------
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

  // Webhook Telegram classico: /botTOKEN
  bot = new TelegramBot(token, { webHook: { port: 0 } });
  await bot.setWebHook(`${publicUrl}/bot${token}`);

  // Endpoint per gli update
  app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  console.log(
    `🤖 Telegram Bot attivo in webhook su: ${publicUrl}/bot${token}`
  );

  registerCommands(bot);
  registerMessages(bot);
}
