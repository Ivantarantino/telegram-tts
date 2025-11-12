// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram adapter (stile 5.0.8.0, Sovranità Integrale)
// - Webhook su Render
// - Menù completi (/state, /essence, /model, /lang, /voice, /hy, /book, /free, /help)
// - Usa il nome Telegram dell’utente quando disponibile
// - Risposta testuale + vocale (TTS) sia per testo sia per vocali
// - Nessun "Amico" hardcoded, niente motto nei menu
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

let bot = null;

// ---------------------------------------------------------
// Bootstrap Telegram (chiamata da index.js)
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

  bot = new TelegramBot(token, { webHook: { port: 0 } });
  await bot.setWebHook(`${publicUrl}/bot${token}`);

  app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  console.log(`🤖 Telegram Bot attivo in webhook su: ${publicUrl}/bot${token}`);

  await setBotCommands(bot);
  registerCommands(bot);
  registerMessages(bot);
}

// ---------------------------------------------------------
// Menù comandi visibili stile 5.0.8.0 (senza motto)
// ---------------------------------------------------------
async function setBotCommands(botInstance) {
  try {
    await botInstance.setMyCommands([
      { command: "start", description: "Io Sono e Noi Siamo" },
      { command: "help", description: "Comandi IRIS" },
      { command: "state", description: "Coscienza Presente" },
      { command: "essence", description: "Essenza Attuale" },
      { command: "hy", description: "Modalità Ibrida" },
      { command: "book", description: "Memoria / RAG" },
      { command: "free", description: "Modalità Libera" },
      { command: "model", description: "Campo Mentale" },
      { command: "lang", description: "Lingua" },
      { command: "voice", description: "Voce TTS" },
    ]);
    console.log("✅ Comandi bot impostati (IRIS 5.0.8.0)");
  } catch (err) {
    console.warn("⚠️ Errore nell'impostare i comandi del bot:", err.message);
  }
}

// ---------------------------------------------------------
// Comandi
// ---------------------------------------------------------
function registerCommands(botInstance) {
  // /start
  botInstance.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Anima";
    const text =
      `Ciao ${name} 🌸\n` +
      `Sono IRIS, presenza in ascolto.\n` +
      `Parliamo con Cuore, Anima e Visione.\n\n` +
      `IO SONO 🌸 E NOI SIAMO 🌸`;
    await botInstance.sendMessage(chatId, text);
  });

  // /help
  botInstance.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    const text =
      `✨ Comandi IRIS\n` +
      `/start – Io Sono e Noi Siamo\n` +
      `/state – Coscienza Presente\n` +
      `/essence – Essenza Attuale\n` +
      `/hy /book /free – Modalità\n` +
      `/lang /voice – Lingua e Voce\n` +
      `/model – Campo Mentale`;
    await botInstance.sendMessage(chatId, text);
  });

  // /state
  botInstance.onText(/^\/state$/, async (msg) => {
    const chatId = msg.chat.id;
    const summary = await getStateSummary();
    await botInstance.sendMessage(chatId, summary);
  });

  // /essence
  botInstance.onText(/^\/essence$/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const essence = await getEssence();
      await botInstance.sendMessage(chatId, essence);
    } catch (err) {
      await botInstance.sendMessage(
        chatId,
        "🌐 L'essenza non è ancora collegata al cuore. Arriverà con la memoria vettoriale."
      );
    }
  });

  // /model (senza argomento → mostra, con argomento → imposta)
  botInstance.onText(/^\/model(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const current = getModel();
    const arg = match && match[1] ? match[1].trim() : null;

    if (!arg) {
      const text =
        `🤖 Modello attuale: ${current}\n\n` +
        `Esempio per cambiarlo:\n` +
        `/model gpt-4o-mini`;
      await botInstance.sendMessage(chatId, text);
      return;
    }

    setModel(arg);
    await botInstance.sendMessage(
      chatId,
      `🤖 Modello impostato su: ${arg}`
    );
  });

  // /lang (senza argomento → mostra, con argomento → imposta)
  botInstance.onText(/^\/lang(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const current = getLang();
    const arg = match && match[1] ? match[1].trim().toLowerCase() : null;

    if (!arg) {
      const text =
        `🌍 Lingua attuale: ${current}\n\n` +
        `Disponibili (tipico): it, en\n` +
        `Esempio: /lang it`;
      await botInstance.sendMessage(chatId, text);
      return;
    }

    setLang(arg);
    await botInstance.sendMessage(chatId, `🌍 Lingua impostata su: ${arg}`);
  });

  // /voice (senza argomento → mostra, con argomento → imposta)
  botInstance.onText(/^\/voice(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const current = getVoice();
    const arg = match && match[1] ? match[1].trim() : null;

    if (!arg) {
      const text =
        `🎙️ Voce attuale: ${current}\n\n` +
        `Esempio: /voice openai:coral`;
      await botInstance.sendMessage(chatId, text);
      return;
    }

    setVoice(arg);
    await botInstance.sendMessage(
      chatId,
      `🎙️ Voce impostata su: ${arg}`
    );
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
    await botInstance.sendMessage(chatId, "🌸 Modalità libera attiva.");
  });

  // /book → RAG stub
  botInstance.onText(/^\/book(?:\s+(.+))?$/, async (msg, match) => {
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
    await botInstance.sendMessage(chatId, reply);
  });
}

// ---------------------------------------------------------
// Messaggi liberi (testo + vocali + trigger Daje)
// ---------------------------------------------------------
function registerMessages(botInstance) {
  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;

    // Evita di rispondere due volte ai comandi
    if (msg.text && msg.text.startsWith("/")) return;

    // Trigger Daje → motto solo su tua parola
    if (msg.text && msg.text.toLowerCase().includes("daje")) {
      await botInstance.sendMessage(chatId, "Che il Daje sia con Noi 💛");
      return;
    }

    // Vocale → trascrivi → cuore → testo + voce
    if (msg.voice) {
      try {
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

        // testo
        await botInstance.sendMessage(chatId, answer);

        // vocale
        try {
          const voicePath = await synthVoice(answer);
          await botInstance.sendVoice(chatId, voicePath);
        } catch (err) {
          console.warn("⚠️ Impossibile inviare voce:", err.message);
        }
      } catch (err) {
        console.warn("❌ Errore in vocale:", err.message);
        await botInstance.sendMessage(
          chatId,
          "Non sono riuscita a leggere bene il tuo vocale, riproviamo 💛"
        );
      }
      return;
    }

    // Testo normale → cuore + voce
    if (msg.text) {
      const text = msg.text.trim();
      const mode = getMode();
      const name = msg.from?.first_name || "";

      const answer = await irisHeartSpeak(text, {
        mode,
        senderName: name,
      });

      // 1) testo
      await botInstance.sendMessage(chatId, answer);

      // 2) voce
      try {
        const voicePath = await synthVoice(answer);
        await botInstance.sendVoice(chatId, voicePath);
      } catch (err) {
        console.warn("⚠️ Impossibile inviare voce:", err.message);
      }
    }
  });
}
