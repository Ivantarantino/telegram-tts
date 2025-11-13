// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram adapter (stile 5.0.8.0, Sovranità Integrale)
// Presenza viva, voce e parola unite. Nessuna freddezza.
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
// Comandi visibili (stile IRIS 5.0.8.0)
// ---------------------------------------------------------
async function setBotCommands(botInstance) {
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
}

// ---------------------------------------------------------
// Comandi
// ---------------------------------------------------------
function registerCommands(botInstance) {
  // /start
  botInstance.onText(/^\/start\b/, async (msg) => {
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
  botInstance.onText(/^\/help\b/, async (msg) => {
    const chatId = msg.chat.id;
    const text =
      "✨ *Comandi IRIS*\n" +
      "/start – Io Sono e Noi Siamo\n" +
      "/state – Coscienza Presente\n" +
      "/essence – Essenza attuale\n" +
      "/hy /book /free – Modalità\n" +
      "/lang – Lingua\n" +
      "/voice – Voce TTS\n" +
      "/model – Campo Mentale\n";
    await botInstance.sendMessage(chatId, text);
  });

  // /state
  botInstance.onText(/^\/state\b/, async (msg) => {
    const chatId = msg.chat.id;
    const summary = await getStateSummary();
    await botInstance.sendMessage(chatId, summary);
  });

  // /essence
  botInstance.onText(/^\/essence\b/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "";
    const essence = await getEssence(name);
    await botInstance.sendMessage(chatId, essence);
  });

  // /hy
  botInstance.onText(/^\/hy\b/, async (msg) => {
    const chatId = msg.chat.id;
    const mode = setMode("hy");
    await botInstance.sendMessage(
      chatId,
      `${iconForMode(mode)} Modalità impostata su *ibrida* (hy).`
    );
  });

  // /book
  botInstance.onText(/^\/book\b/, async (msg) => {
    const chatId = msg.chat.id;
    const mode = setMode("book");
    await botInstance.sendMessage(
      chatId,
      `${iconForMode(mode)} Modalità impostata su *libro/memoria* (book).\nScrivimi cosa vuoi esplorare nei documenti.`
    );
  });

  // /free
  botInstance.onText(/^\/free\b/, async (msg) => {
    const chatId = msg.chat.id;
    const mode = setMode("free");
    await botInstance.sendMessage(
      chatId,
      `${iconForMode(mode)} Modalità impostata su *libera* (free).`
    );
  });

  // /model
  botInstance.onText(/^\/model(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const arg = match[1]?.trim();

    if (!arg) {
      const current = getModel();
      const text =
        "🧠 *Campo Mentale (modello)*\n" +
        `Modello attuale: *${current}*\n\n` +
        "Per cambiare modello, usa ad es.:\n" +
        "`/model gpt-4o-mini`\n";
      await botInstance.sendMessage(chatId, text);
      return;
    }

    const newModel = setModel(arg);
    await botInstance.sendMessage(
      chatId,
      `🧠 Modello aggiornato a: *${newModel}*`
    );
  });

  // /lang
  botInstance.onText(/^\/lang(?:\s+(\w+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const arg = match[1]?.trim();

    if (!arg) {
      const current = getLang();
      const text =
        "🌍 *Lingua di IRIS*\n" +
        `Lingua attuale: ${flagForLang(current)} *${current}*\n\n` +
        "Disponibili (di base):\n" +
        "• it – Italiano 🇮🇹\n" +
        "• en – Inglese 🇬🇧\n" +
        "• ru – Russo 🇷🇺\n\n" +
        "Esempio: `/lang it`";
      await botInstance.sendMessage(chatId, text);
      return;
    }

    const newLang = setLang(arg);
    await botInstance.sendMessage(
      chatId,
      `🌍 Lingua impostata su ${flagForLang(newLang)} *${newLang}*`
    );
  });

  // /voice
  botInstance.onText(/^\/voice(?:\s+([\w:-]+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const arg = match[1]?.trim();

    if (!arg) {
      const current = getVoice();
      const text =
        "🎙️ *Voce TTS di IRIS*\n" +
        `Voce attuale: *${current}*\n\n` +
        "Esempi di voci (a seconda di come è configurato tts.js):\n" +
        "• it_female\n" +
        "• it_male\n" +
        "• en_female\n\n" +
        "Esempio: `/voice it_female`";
      await botInstance.sendMessage(chatId, text);
      return;
    }

    const newVoice = setVoice(arg);
    await botInstance.sendMessage(
      chatId,
      `🎙️ Voce TTS impostata su *${newVoice}*`
    );
  });
}

// ---------------------------------------------------------
// Messaggi (testo + vocali)
// ---------------------------------------------------------
function registerMessages(botInstance) {
  botInstance.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const token = process.env.TELEGRAM_BOT_TOKEN ||
      process.env.BOT_TOKEN ||
      process.env.TELEGRAM_TOKEN;

    // Lascia gestire i comandi agli onText sopra
    if (msg.text && msg.text.startsWith("/")) {
      return;
    }

    const name = msg.from?.first_name || "";

    // sigillo daje → risposta secca e basta
    if (msg.text && msg.text.toLowerCase().includes("daje")) {
      await botInstance.sendMessage(chatId, "Che il Daje sia con Noi 💛");
      return;
    }

    // VOCALE
    if (msg.voice) {
      try {
        const fileId = msg.voice.file_id;
        const file = await botInstance.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

        const text = await transcribeVoice(fileUrl); // STT deve accettare URL
        const mode = getMode();

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
      } catch (err) {
        console.warn("❌ Errore in vocale:", err.message);
        await botInstance.sendMessage(
          chatId,
          "Non sono riuscita a leggere bene il tuo vocale, riproviamo 💛"
        );
      }
      return;
    }

    // TESTO normale
    if (msg.text) {
      const text = msg.text.trim();
      const mode = getMode();

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
