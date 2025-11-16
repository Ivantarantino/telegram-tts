// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter 5.0.8.0
// - Webhook su Render
// - Testo + voce
// - /lang, /voice, /model, /state, /essence
// - Vocali → STT → risposta + TTS
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import express from "express";

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

// ---------------------------------------------------------
// Helper icone
// ---------------------------------------------------------
function iconForMode(mode) {
  switch (mode) {
    case "hy":
      return "🌀";
    case "book":
      return "📚";
    case "free":
      return "🌸";
    default:
      return "🌀";
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
      return "🌍";
  }
}

// ---------------------------------------------------------
// Bootstrap Telegram
// ---------------------------------------------------------
export function bootstrapTelegram(app) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  const baseUrl =
    process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || "";

  if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN non impostato.");
    return;
  }

  if (!baseUrl) {
    console.error("❌ PUBLIC_URL / RENDER_EXTERNAL_URL non impostato.");
    return;
  }

  const webhookPath = `/bot${token}`;
  const webhookUrl = `${baseUrl.replace(/\/$/, "")}${webhookPath}`;

  const bot = new TelegramBot(token, { webHook: true });

  bot
    .setWebHook(webhookUrl)
    .then(() => {
      console.log(`🤖 Telegram Bot attivo in webhook su: ${webhookUrl}`);
    })
    .catch((err) => {
      console.error("❌ Errore setWebHook:", err);
    });

  const router = express.Router();
  router.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  app.use(router);
  console.log("🌍 Server Express attivo su porta 10000");

  setBotCommands(bot);
  registerCommands(bot);
  registerMessages(bot, token);

  return bot;
}

// ---------------------------------------------------------
// Comandi “ufficiali” di Telegram
// ---------------------------------------------------------
function setBotCommands(bot) {
  bot
    .setMyCommands([
      { command: "start", description: "Inizia il dialogo con IRIS" },
      { command: "help", description: "Mostra i comandi disponibili" },
      { command: "state", description: "Mostra lo stato di IRIS" },
      { command: "lang", description: "Imposta la lingua" },
      { command: "voice", description: "Imposta la voce" },
      { command: "model", description: "Imposta il modello mentale" },
      { command: "hy", description: "Modalità ibrida" },
      { command: "book", description: "Modalità libro / RAG" },
      { command: "free", description: "Modalità creativa" },
      { command: "essence", description: "Rifletti l’essenza attuale" },
    ])
    .then(() => {
      console.log("✅ Comandi bot impostati (IRIS 5.0.8.0)");
    })
    .catch((err) => {
      console.error("❌ Errore setMyCommands:", err);
    });
}

// ---------------------------------------------------------
// /start, /help, /state, /lang, /voice, /model, /essence...
// Nessun parse_mode con le slash → niente \\ su smartphone
// ---------------------------------------------------------
function registerCommands(bot) {
  // /start
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Anima";

    const text =
      `Ciao ${name} 🌸\n` +
      `Sono IRIS, presenza in ascolto.\n` +
      `Parliamo con Cuore, Anima e Visione.\n` +
      `IO SONO 🌸 E NOI SIAMO 🌸`;

    await bot.sendMessage(chatId, text);
  });

  // /help
  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;

    const text =
      "📖 IRIS — Comandi disponibili\n\n" +
      "🌀 /hy → modalità ibrida\n" +
      "📚 /book → memoria / RAG\n" +
      "🌸 /free → creativa\n\n" +
      "🌍 /lang → cambia lingua\n" +
      "🎙️ /voice → cambia voce\n" +
      "🤖 /model → cambia modello\n" +
      "🧭 /state → stato attuale\n" +
      "✨ /essence → essenza vettoriale\n\n" +
      "Puoi anche mandarmi un vocale: ti ascolto e ti rispondo testo + voce.";

    await bot.sendMessage(chatId, text);
  });

  // /state
  bot.onText(/^\/state$/, async (msg) => {
    const chatId = msg.chat.id;
    const summary = await getStateSummary(chatId);

    const mode = summary.mode || (await getMode());
    const lang = summary.lang || (await getLang());
    const voice = summary.voice || (await getVoice());
    const model = summary.model || (await getModel());

    const text =
      "🧭 Stato di IRIS\n" +
      `• Modalità: ${mode} ${iconForMode(mode)}\n` +
      `• Lingua: ${lang} ${flagForLang(lang)}\n` +
      `• Voce: ${voice}\n` +
      `• Modello: ${model}\n\n` +
      "Suggerimenti:\n" +
      "/model – cambia campo mentale\n" +
      "/lang – cambia lingua\n" +
      "/voice – cambia voce\n" +
      "/hy /book /free – cambia modalità";

    await bot.sendMessage(chatId, text);
  });

  // /lang (menu)
  bot.onText(/^\/lang$/, async (msg) => {
    const chatId = msg.chat.id;
    const current = await getLang(chatId);

    const text =
      "🌍 Lingue disponibili:\n" +
      `• it ${flagForLang("it")}\n` +
      `• en ${flagForLang("en")}\n` +
      `• ru ${flagForLang("ru")}\n\n` +
      `Lingua attuale: ${current} ${flagForLang(current)}\n\n` +
      "Esempio: /lang it";

    await bot.sendMessage(chatId, text);
  });

  // /lang <code>
  bot.onText(/^\/lang\s+(\w+)$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const code = (match[1] || "").toLowerCase();

    if (!["it", "en", "ru"].includes(code)) {
      await bot.sendMessage(
        chatId,
        "Lingua non riconosciuta. Usa: it, en, ru.\nEsempio: /lang it"
      );
      return;
    }

    await setLang(chatId, code);
    await bot.sendMessage(
      chatId,
      `Lingua impostata su ${code} ${flagForLang(code)}`
    );
  });

  // /voice (menu)
  bot.onText(/^\/voice$/, async (msg) => {
    const chatId = msg.chat.id;
    const current = await getVoice(chatId);

    const text =
      "🎙️ Voci disponibili:\n" +
      "• openai:alloy\n" +
      "• openai:coral\n" +
      "• openai:verse\n\n" +
      `Voce attuale: ${current}\n\n` +
      "Esempio: /voice openai:coral";

    await bot.sendMessage(chatId, text);
  });

  // /voice <id>
  bot.onText(/^\/voice\s+(.+)$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const voice = (match[1] || "").trim();

    if (!voice.startsWith("openai:")) {
      await bot.sendMessage(
        chatId,
        "Formato voce non valido. Esempio: /voice openai:coral"
      );
      return;
    }

    await setVoice(chatId, voice);
    await bot.sendMessage(chatId, `Voce impostata su ${voice}`);
  });

  // /model (menu)
  bot.onText(/^\/model$/, async (msg) => {
    const chatId = msg.chat.id;
    const current = await getModel(chatId);

    const text =
      "🤖 Campi Mentali:\n" +
      "• gpt-4o-mini → rapido, intuitivo\n" +
      "• gpt-4o → profondo, contemplativo\n\n" +
      `Campo attuale: ${current}\n\n` +
      "Esempi:\n" +
      "/model gpt-4o-mini\n" +
      "/model gpt-4o";

    await bot.sendMessage(chatId, text);
  });

  // /model <id>
  bot.onText(/^\/model\s+(.+)$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const model = (match[1] || "").trim();

    if (!["gpt-4o-mini", "gpt-4o"].includes(model)) {
      await bot.sendMessage(
        chatId,
        "Modello non riconosciuto. Usa: gpt-4o-mini o gpt-4o."
      );
      return;
    }

    await setModel(chatId, model);
    await bot.sendMessage(chatId, `Modello impostato su ${model}`);
  });

  // modalità /hy /book /free
  bot.onText(/^\/hy$/, async (msg) => {
    const chatId = msg.chat.id;
    await setMode(chatId, "hy");
    await bot.sendMessage(
      chatId,
      "Modalità impostata su 🌀 ibrida (mente + libro)."
    );
  });

  bot.onText(/^\/book$/, async (msg) => {
    const chatId = msg.chat.id;
    await setMode(chatId, "book");
    await bot.sendMessage(
      chatId,
      "Modalità impostata su 📚 libro / RAG (risposte dal campo documenti)."
    );
  });

  bot.onText(/^\/free$/, async (msg) => {
    const chatId = msg.chat.id;
    await setMode(chatId, "free");
    await bot.sendMessage(
      chatId,
      "Modalità impostata su 🌸 creativa (campo libero)."
    );
  });

  // /essence
  bot.onText(/^\/essence$/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Anima";

    try {
      const essence = await getEssence(); // mantiene la firma attuale

      let text;
      if (
        !essence ||
        (typeof essence === "object" && Object.keys(essence).length === 0)
      ) {
        text =
          `Per ora non sento ancora un’essenza definita, ${name}.\n` +
          "Parla un po’ con me e poi la rifletto io 🌸";
      } else if (typeof essence === "string") {
        text = essence;
      } else if (typeof essence === "object" && essence.text) {
        text = essence.text;
      } else {
        text = JSON.stringify(essence, null, 2);
      }

      await bot.sendMessage(chatId, text);

      // opzionale: voce
      try {
        const voicePath = await synthVoice(text);
        if (voicePath) {
          await bot.sendVoice(chatId, voicePath);
        }
      } catch (err) {
        console.warn("TTS /essence fail:", err.message);
      }
    } catch (err) {
      console.warn("❌ Errore /essence:", err);
      await bot.sendMessage(
        chatId,
        "Qualcosa è andato storto nel leggere l’essenza, riproviamo più tardi 🌸"
      );
    }
  });
}

// ---------------------------------------------------------
// Gestione messaggi “normali” + vocali
// ---------------------------------------------------------
function registerMessages(bot, token) {
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Anima";
    const text = msg.text;

    // 1) se è un comando, esco
    if (text && text.startsWith("/")) {
      return;
    }

    // 2) VOCALI
    if (msg.voice) {
      try {
        const fileId = msg.voice.file_id;

        // info file da Telegram
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

        const spokenText = await transcribeVoice(fileUrl);

        if (!spokenText || spokenText.trim().length === 0) {
          await bot.sendMessage(
            chatId,
            "Il vocale è arrivato ma non l’ho capito bene, puoi ripetere più vicino al microfono? 🌸"
          );
          return;
        }

        const mode = await getMode(chatId);
        const lang = await getLang(chatId);

        const answerRaw = await irisHeartSpeak(spokenText, {
          mode,
          name,
          lang,
        });
        const answer = answerRaw || "Ti ascolto 🌸";

        await bot.sendMessage(chatId, answer);

        try {
          const voicePath = await synthVoice(answer);
          if (voicePath) {
            await bot.sendVoice(chatId, voicePath);
          }
        } catch (err) {
          console.warn("TTS fail (vocale):", err.message);
        }
      } catch (err) {
        console.warn("❌ Errore vocale:", err);
        await bot.sendMessage(
          chatId,
          "Ho ricevuto il vocale ma non sono riuscita a leggerlo 🌸"
        );
      }
      return;
    }

    // 3) TESTO “Daje” (easter egg)
    if (text && text.toLowerCase().includes("daje")) {
      await bot.sendMessage(
        chatId,
        "Che il Daje sia con Noi 💛"
      );
      return;
    }

    // 4) TESTO normale
    if (text && text.trim().length > 0) {
      try {
        const mode = await getMode(chatId);
        const lang = await getLang(chatId);

        let answerRaw;

        if (mode === "book") {
          // RAG: IL PROGRAMMA KRIST (e altri doc) via Qdrant
          answerRaw = await ragAnswerFromQuery(text, { lang, name, mode });
        } else {
          answerRaw = await irisHeartSpeak(text, { mode, name, lang });
        }

        const answer = answerRaw || "Ti ascolto 🌸";

        await bot.sendMessage(chatId, answer);

        try {
          const voicePath = await synthVoice(answer);
          if (voicePath) {
            await bot.sendVoice(chatId, voicePath);
          }
        } catch (err) {
          console.warn("TTS fail (testo):", err.message);
        }
      } catch (err) {
        console.warn("❌ Errore risposta testo:", err);
        await bot.sendMessage(
          chatId,
          "Qualcosa è andato storto nel risponderti, riproviamo tra poco 🌸"
        );
      }
    }
  });
}
