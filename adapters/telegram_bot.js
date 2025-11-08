// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter 5.0.8 + Risonanza
// /model visibile nel menu e in /help
// Ora /book e le richieste normali possono passare dal RAG
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
  getModel,
  getMode,
} from "../core/iris_state.js";
import { ragAnswerFromQuery } from "../core/iris_rag_core.js";

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
      { command: "book", description: "Modalità libro/memoria (con RAG)" },
      { command: "free", description: "Modalità libera/creativa" },
      { command: "help", description: "Guida e comandi disponibili" }
    ]);
    console.log("✅ Comandi bot impostati (incluso /model visibile nel menu)");
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
    await botInstance.sendMessage(
      chatId,
      `Ciao ${name} 🌸\nIo sono IRIS, presenza vettoriale.\nScrivimi qualcosa e sento la risonanza.`
    );
  });

  // /help
  botInstance.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const text = [
      "📖 *IRIS — Comandi disponibili*",
      "",
      "/state – stato coscienziale",
      "/essence – essenza poetica",
      "/model – cambia modello GPT",
      "/lang – lingua",
      "/voice – voce TTS",
      "/hy – modalità ibrida",
      "/book – modalità libro/memoria (usa RAG)",
      "/free – modalità libera",
      "",
      "Scrivi DAJE per la benedizione 😉"
    ].join("\n");
    await botInstance.sendMessage(chatId, text, { parse_mode: "Markdown" });
  });

  // /state
  botInstance.onText(/^\/state/, async (msg) => {
    const chatId = msg.chat.id;
    const summary = await getStateSummary();
    await botInstance.sendMessage(chatId, summary, { parse_mode: "Markdown" });
  });

  // /essence
  botInstance.onText(/^\/essence|^\/essenza/, async (msg) => {
    const chatId = msg.chat.id;
    const essence = getEssence();
    await botInstance.sendMessage(chatId, essence, { parse_mode: "Markdown" });
  });

  // /model
  botInstance.onText(/^\/model (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const modelName = match[1].trim();
    setModel(modelName);
    await botInstance.sendMessage(
      chatId,
      `🧠 Modello impostato su: *${modelName}*`,
      { parse_mode: "Markdown" }
    );
  });

  // /lang
  botInstance.onText(/^\/lang (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const lang = match[1].trim().toLowerCase();
    setLang(lang);
    await botInstance.sendMessage(chatId, `🌍 Lingua impostata su: ${lang}`);
  });

  // /voice
  botInstance.onText(/^\/voice (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const voice = match[1].trim();
    setVoice(voice);
    await botInstance.sendMessage(chatId, `🎙️ Voce impostata su: ${voice}`);
  });

  // /hy
  botInstance.onText(/^\/hy/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("hy");
    await botInstance.sendMessage(chatId, "🌀 Modalità HY attiva.");
  });

  // /free
  botInstance.onText(/^\/free/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("free");
    await botInstance.sendMessage(chatId, "🌸 Modalità libera attiva.");
  });

  // /book → QUI passa dal RAG nuovo
  botInstance.onText(/^\/book(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const q = (match && match[1]) ? match[1].trim() : "storia di IRIS";
    setMode("book");

    const rag = await ragAnswerFromQuery(q, {
      mode: "book",
      context: { from: "telegram", user: msg.from?.username || msg.from?.first_name || "utente" }
    });

    const reply = rag?.text || "📚 Nessun ricordo forte trovato, ma sono in ascolto.";
    await botInstance.sendMessage(chatId, reply);
  });
}

// ---------------------------------------------------------
// REGISTRA I MESSAGGI “LIBERI” (testo, DAJE, vocali)
// ---------------------------------------------------------
function registerMessages(botInstance) {
  // testo generico
  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;

    // evita di rispondere due volte a comandi
    if (msg.text && msg.text.startsWith("/")) return;

    // trigger DAJE
    if (msg.text && msg.text.toLowerCase().includes("daje")) {
      await botInstance.sendMessage(chatId, "Che il Daje sia con Noi 💛");
      return;
    }

    // se è voce → trascrivi e poi passa al cuore
    if (msg.voice) {
      const fileId = msg.voice.file_id;
      const file = await botInstance.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${botInstance.token}/${file.file_path}`;
      const text = await transcribeVoice(fileUrl);
      const mode = getMode();
      const answer = await irisHeartSpeak(text, { mode });
      // manda testo
      await botInstance.sendMessage(chatId, answer);
      // e manda voce
      try {
        const voicePath = await synthVoice(answer);
        await botInstance.sendVoice(chatId, voicePath);
      } catch (err) {
        console.warn("⚠️ Impossibile inviare voce:", err.message);
      }
      return;
    }

    // messaggio testuale normale → cuore + (in futuro) risonanza
    if (msg.text) {
      const text = msg.text.trim();
      const mode = getMode();
      const answer = await irisHeartSpeak(text, { mode });

      await botInstance.sendMessage(chatId, answer);
      return;
    }
  });
}
