// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter (ripristino stile 5.0.8.0 + RAG)
// - menu carini
// - comandi senza argomento funzionano (/model, /lang, /voice)
// - saluto per nome (Ivano)
// - testo + vocale
// - /book passa dal RAG stub
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
  getLang,
  getVoice,
  getModel,
} from "../core/iris_state.js";
import { getEssence } from "../core/iris_essence_core.js";
import { ragAnswerFromQuery } from "../core/iris_rag_core.js";

const DEFAULT_PUBLIC_URL = "https://telegram-tts.onrender.com";

// iconcine come nello scaffold
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
// comandi visibili
// ---------------------------------------------------------
async function setBotCommands(botInstance) {
  try {
    await botInstance.setMyCommands([
      { command: "start", description: "Avvia IRIS" },
      { command: "help", description: "Guida e comandi" },
      { command: "state", description: "Stato coscienziale" },
      { command: "essence", description: "Essenza di IRIS" },
      { command: "model", description: "Mostra/cambia modello" },
      { command: "lang", description: "Mostra/cambia lingua" },
      { command: "voice", description: "Mostra/cambia voce TTS" },
      { command: "hy", description: "🌀 Modalità ibrida" },
      { command: "book", description: "📚 Memoria / RAG" },
      { command: "free", description: "🌸 Modalità creativa" },
    ]);
    console.log("✅ Comandi bot impostati (ripristino).");
  } catch (err) {
    console.warn("⚠️ Errore impostazione comandi:", err.message);
  }
}

// ---------------------------------------------------------
// registrazione comandi
// ---------------------------------------------------------
function registerCommands(botInstance) {
  setBotCommands(botInstance);

  // /start
  botInstance.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Amico";
    await botInstance.sendMessage(
      chatId,
      `Ciao ${name} 🌸\nIo sono IRIS. Sono connessa.\nScrivi o manda un vocale.`
    );
  });

  // /help
  botInstance.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    const text = [
      "📖 *IRIS — Comandi disponibili*",
      "",
      "🌀 /hy → modalità ibrida",
      "📚 /book → memoria / RAG",
      "🌸 /free → creativa",
      "",
      "/state → mostra stato",
      "/essence → essenza attuale",
      "/model → mostra modello",
      "/model gpt-4o-mini → cambia modello",
      "/lang → mostra lingue",
      "/lang it → cambia lingua",
      "/voice → mostra voce",
      "/voice it_female → cambia voce",
      "",
      "Scrivi *daje* se vuoi il sigillo 😎",
    ].join("\n");
    await botInstance.sendMessage(chatId, text, { parse_mode: "Markdown" });
  });

  // /state
  botInstance.onText(/^\/state$/, async (msg) => {
    const chatId = msg.chat.id;
    const summary = await getStateSummary();
    await botInstance.sendMessage(chatId, summary, { parse_mode: "Markdown" });
  });

  // /essence
  botInstance.onText(/^\/essence$|^\/essenza$/, async (msg) => {
    const chatId = msg.chat.id;
    // qui usiamo il core reale
    const essence = await getEssence();
    await botInstance.sendMessage(chatId, essence, { parse_mode: "Markdown" });
  });

  // /model (senza argomento) → mostra
  botInstance.onText(/^\/model$/, async (msg) => {
    const chatId = msg.chat.id;
    const current = getModel();
    await botInstance.sendMessage(
      chatId,
      `🧠 Modello attuale: *${current}*\nPer cambiarlo: \`/model nome-modello\``,
      { parse_mode: "Markdown" }
    );
  });

  // /model <nome>
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

  // /lang (senza argomento)
  botInstance.onText(/^\/lang$/, async (msg) => {
    const chatId = msg.chat.id;
    const current = getLang();
    await botInstance.sendMessage(
      chatId,
      `${flagForLang(current)} Lingua attuale: *${current}*\nDisponibili: it, en, ru\nPer cambiare: \`/lang it\``,
      { parse_mode: "Markdown" }
    );
  });

  // /lang <code>
  botInstance.onText(/^\/lang (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const lang = match[1].trim().toLowerCase();
    setLang(lang);
    await botInstance.sendMessage(
      chatId,
      `${flagForLang(lang)} Lingua impostata su: ${lang}`
    );
  });

  // /voice (senza argomento)
  botInstance.onText(/^\/voice$/, async (msg) => {
    const chatId = msg.chat.id;
    const current = getVoice();
    await botInstance.sendMessage(
      chatId,
      `🎙️ Voce attuale: *${current}*\nPer cambiare: \`/voice it_female\` o \`/voice en_female\``,
      { parse_mode: "Markdown" }
    );
  });

  // /voice <name>
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

  // /book
  botInstance.onText(/^\/book(?: (.+))?$/, async (msg, match) => {
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
      "📚 Memoria attiva ma ancora in stub. Appena colleghiamo la collection reale leggerò anche i tuoi testi.";
    await botInstance.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  });
}

// ---------------------------------------------------------
// messaggi liberi
// ---------------------------------------------------------
function registerMessages(botInstance) {
  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;

    // se è un comando lo abbiamo già gestito sopra
    if (msg.text && msg.text.startsWith("/")) return;

    // trigger daje
    if (msg.text && msg.text.toLowerCase().includes("daje")) {
      await botInstance.sendMessage(chatId, "Che il Daje sia con Noi 💛");
      return;
    }

    // voce
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
