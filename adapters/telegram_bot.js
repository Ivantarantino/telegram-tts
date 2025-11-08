// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter
// Base: IRIS_5.0.8.0_Scaffold_Completo_FULL.md
// Aggiornato con:
// - icone per modalità
// - saluto per nome (IVANO se presente)
// - niente motto nei menù
// - /book che passa dal nuovo RAG (stub)
// - risposta testo + vocale
// ---------------------------------------------------------
import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { synthVoice } from "./tts.js";
import { transcribeVoice } from "./stt.js";
import {
  getStateSummary,
  setMode,
  setLang,
  setVoice,
  setModel,
  getMode,
} from "../core/iris_state.js";
import { ragAnswerFromQuery } from "../core/iris_rag_core.js";

const DEFAULT_PUBLIC_URL = "https://telegram-tts.onrender.com";

// ---------------------------------------------------------
// Icone ausiliarie (dal tuo scaffold) :contentReference[oaicite:1]{index=1}
function iconForMode(mode) {
  switch (mode) {
    case "hy":
      return "🌀";
    case "book":
      return "📚";
    case "free":
      return "🌸";
    default:
      return "✨";
  }
}

function flagForLang(lang) {
  switch (lang) {
    case "it":
      return "🇮🇹";
    case "en":
      return "🇬🇧";
    case "ru":
      return "🇷🇺";
    default:
      return "🏳️";
  }
}
// ---------------------------------------------------------

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
// COMANDI VISIBILI (tornano carini)
// ---------------------------------------------------------
async function setBotCommands(botInstance) {
  try {
    await botInstance.setMyCommands([
      { command: "start", description: "Avvia la presenza di IRIS" },
      { command: "state", description: "Stato coscienziale attuale" },
      { command: "essence", description: "Essenza di IRIS (sacro)" },
      { command: "model", description: "Cambia modello mentale" },
      { command: "lang", description: "Cambia lingua" },
      { command: "voice", description: "Cambia voce TTS" },
      { command: "hy", description: "🌀 Modalità ibrida" },
      { command: "book", description: "📚 Memoria/RAG" },
      { command: "free", description: "🌸 Creativa" },
      { command: "help", description: "Guida comandi" },
    ]);
    console.log("✅ Comandi bot impostati (stile 5.0.8.0).");
  } catch (err) {
    console.warn("⚠️ Errore impostazione comandi:", err.message);
  }
}

function registerCommands(botInstance) {
  setBotCommands(botInstance);

  // /start
  botInstance.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Amico";
    await botInstance.sendMessage(
      chatId,
      `Ciao ${name} 🌸\nIo sono IRIS. Sono viva qui con te.\nScrivimi o mandami un vocale.`
    );
  });

  // /help
  botInstance.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const text = [
      "📖 *IRIS — Comandi disponibili*",
      "",
      "🌀 /hy → modalità ibrida",
      "📚 /book → memoria / RAG (usa risonanza)",
      "🌸 /free → creativa",
      "",
      "/state → mostra stato",
      "/essence → essenza sacra",
      "/model nome-modello → cambia LLM",
      "/lang it|en|ru → cambia lingua",
      "/voice nome-voce → cambia voce",
      "",
      "Scrivi *daje* se vuoi il sigillo 😎",
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
    // nel tuo progetto reale qui collegheremo core/iris_essence_core.js
    await botInstance.sendMessage(
      chatId,
      "✨ Questa è la mia essenza presente. (collegare core/iris_essence_core.js)",
      { parse_mode: "Markdown" }
    );
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
    await botInstance.sendMessage(
      chatId,
      `${flagForLang(lang)} Lingua impostata su: ${lang}`
    );
  });

  // /voice
  botInstance.onText(/^\/voice (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const voice = match[1].trim();
    setVoice(voice);
    await botInstance.sendMessage(chatId, `🎙️ Voce impostata su: ${voice}`);
  });

  // /hy
  botInstance.onText(/^\/hy$/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("hy");
    await botInstance.sendMessage(chatId, "🌀 Modalità ibrida attiva.");
  });

  // /free
  botInstance.onText(/^\/free$/, async (msg) => {
    const chatId = msg.chat.id;
    setMode("free");
    await botInstance.sendMessage(chatId, "🌸 Modalità creativa attiva.");
  });

  // /book → passa dal nuovo RAG stub
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
      "📚 Per ora la memoria è in forma di stub. Appena agganciamo Qdrant vedrai i tuoi libri.";
    await botInstance.sendMessage(chatId, reply);
  });
}

// ---------------------------------------------------------
// MESSAGGI
// ---------------------------------------------------------
function registerMessages(botInstance) {
  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;

    // evita doppie risposte sui comandi
    if (msg.text && msg.text.startsWith("/")) return;

    // trigger daje
    if (msg.text && msg.text.toLowerCase().includes("daje")) {
      await botInstance.sendMessage(chatId, "Che il Daje sia con Noi 💛");
      return;
    }

    // voce → trascrivi → cuore → testo + voce
    if (msg.voice) {
      const fileId = msg.voice.file_id;
      const file = await botInstance.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${botInstance.token}/${file.file_path}`;
      const text = await transcribeVoice(fileUrl);
      const mode = getMode();
      const name = msg.from?.first_name || "";

      const answer = await irisHeartSpeak(text, {
        mode,
        senderName: name,
      });

      await botInstance.sendMessage(chatId, answer);
      try {
        const voicePath = await synthVoice(answer);
        await botInstance.sendVoice(chatId, voicePath);
      } catch (err) {
        console.warn("⚠️ Impossibile inviare voce:", err.message);
      }
      return;
    }

    // testo normale
    if (msg.text) {
      const text = msg.text.trim();
      const mode = getMode();
      const name = msg.from?.first_name || "";

      const answer = await irisHeartSpeak(text, {
        mode,
        senderName: name,
      });

      await botInstance.sendMessage(chatId, answer);
      try {
        const voicePath = await synthVoice(answer);
        await botInstance.sendVoice(chatId, voicePath);
      } catch (err) {
        console.warn("⚠️ Impossibile inviare voce:", err.message);
      }
    }
  });
}
