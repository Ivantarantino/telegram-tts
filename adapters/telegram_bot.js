// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter 5.0.8 + Risonanza + TTS su testo
// Aggiornato per:
// - mandare anche il vocale dopo le risposte testuali
// - usare il nome dell’utente (IVANO) quando disponibile
// - non mostrare "Che il Daje sia con Noi" nei menu
// - /book passa dal RAG
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
// (senza motto dentro)
// ---------------------------------------------------------
async function setBotCommands(botInstance) {
  try {
    await botInstance.setMyCommands([
      { command: "start", description: "Inizia il dialogo con IRIS" },
      { command: "state", description: "Mostra lo stato coscienziale" },
      { command: "essence", description: "Mostra l'essenza attuale" },
      { command: "model", description: "Cambia il modello" },
      { command: "lang", description: "Imposta la lingua" },
      { command: "voice", description: "Cambia la voce TTS" },
      { command: "hy", description: "Modalità ibrida" },
      { command: "book", description: "Modalità libro/memoria (RAG)" },
      { command: "free", description: "Modalità libera" },
      { command: "help", description: "Guida e comandi" },
    ]);
    console.log("✅ Comandi bot impostati (puliti, senza motto).");
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
      `Ciao ${name} 🌸\nIo sono IRIS, sono in ascolto. Scrivimi qualcosa.`
    );
  });

  // /help
  botInstance.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const text = [
      "📖 *IRIS — Comandi*",
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
      "Scrivi 'daje' se vuoi la benedizione 😉",
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

  // /book → RAG
  botInstance.onText(/^\/book(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const q = match && match[1] ? match[1].trim() : "storia di IRIS";
    setMode("book");

    const rag = await ragAnswerFromQuery(q, {
      mode: "book",
      context: {
        from: "telegram",
        user: msg.from?.username || msg.from?.first_name || "utente",
      },
    });

    const reply =
      rag?.text ||
      "📚 Nessun ricordo forte trovato, ma la memoria vettoriale è in attenzione.";
    await botInstance.sendMessage(chatId, reply);
  });
}

// ---------------------------------------------------------
// REGISTRA I MESSAGGI “LIBERI” (testo, DAJE, vocali)
// ---------------------------------------------------------
function registerMessages(botInstance) {
  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;

    // evita di rispondere due volte ai comandi
    if (msg.text && msg.text.startsWith("/")) return;

    // trigger DAJE
    if (msg.text && msg.text.toLowerCase().includes("daje")) {
      await botInstance.sendMessage(chatId, "Che il Daje sia con Noi 💛");
      return;
    }

    // se è un vocale → trascrivi e rispondi (testo + voce)
    if (msg.voice) {
      const fileId = msg.voice.file_id;
      const file = await botInstance.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${botInstance.token}/${file.file_path}`;
      const text = await transcribeVoice(fileUrl);
      const mode = getMode();
      const name = msg.from?.first_name || "Amico";

      const answer = await irisHeartSpeak(text, {
        mode,
        senderName: name,
      });

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

    // messaggio testuale normale → cuore + voce
    if (msg.text) {
      const text = msg.text.trim();
      const mode = getMode();
      const name = msg.from?.first_name || "Amico";

      const answer = await irisHeartSpeak(text, {
        mode,
        senderName: name,
      });

      // 1. manda testo
      await botInstance.sendMessage(chatId, answer);

      // 2. prova a mandare anche la voce
      try {
        const voicePath = await synthVoice(answer);
        await botInstance.sendVoice(chatId, voicePath);
      } catch (err) {
        console.warn("⚠️ Impossibile inviare voce:", err.message);
      }

      return;
    }
  });
}
