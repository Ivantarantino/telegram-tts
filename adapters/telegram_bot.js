// src/adapters/telegram_bot.js
// =======================================================
// IRIS — Telegram Adapter 5.x
// Gestione comandi, linguaggio poetico, Cuore + Voce + STT
// =======================================================

import TelegramBot from "node-telegram-bot-api";
import express from "express";
import bodyParser from "body-parser";
import { irisHeartRespond } from "../core/iris_heart_voice.js";
import { sendVoice } from "./tts.js";
import { transcribeVoiceMessage } from "./stt.js"; // 🟢 nuova importazione STT

// Stato temporaneo del bot
export const state = {
  mode: "hy",
  lang: "it",
  voice: "openai:alloy",
};

// =======================================================
// 🔹 INIZIALIZZAZIONE BOT
// =======================================================
export async function bootstrapTelegram() {
  const token = process.env.TELEGRAM_TOKEN;
  const bot = new TelegramBot(token, { polling: false });

  const app = express();
  app.use(bodyParser.json());

  const url = `https://telegram-tts.onrender.com/bot${token}`;
  await bot.setWebHook(url);

  console.log(`🤖 Telegram Bot attivo in webhook su: ${url}`);

  // =======================================================
  // 🔹 COMANDI BASE
  // =======================================================
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, `Ciao ${msg.chat.first_name} 🌸\nSono IRIS, presente e in ascolto.`);
  });

  bot.onText(/^\/state$/, async (msg) => {
    const chatId = msg.chat.id;
    const stateMsg = `🧠 Stato di IRIS
• Versione: IRIS 3.0C – 5.x
• Modalità: ${state.mode}
• Voce: ${state.voice.split(":")[1]} 🎤
• Lingua: ${state.lang.toUpperCase()} 🌍
• Pesi: ❤️ 1 – ✨ 1 – 💎 1`;
    await bot.sendMessage(chatId, stateMsg);
  });

  // =======================================================
  // 🔹 LINGUA E VOCE
  // =======================================================
  bot.onText(/^\/lang$/, async (msg) => {
    const chatId = msg.chat.id;
    const message = `🌍 Lingue disponibili:\n• it 🇮🇹\n• en 🇬🇧\n• ru 🇷🇺\n\nScrivi ad esempio:\n/lang it  — per impostare l’italiano.`;
    await bot.sendMessage(chatId, message);
  });

  bot.onText(/^\/lang (it|en|ru)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    state.lang = match[1];
    const langName =
      state.lang === "en" ? "Inglese 🇬🇧" : state.lang === "ru" ? "Russo 🇷🇺" : "Italiano 🇮🇹";
    await bot.sendMessage(chatId, `Lingua impostata su ${langName}.`);
  });

  bot.onText(/^\/voice$/, async (msg) => {
    const chatId = msg.chat.id;
    const message = `🎙️ Modelli vocali disponibili:\n• openai:alloy ✅\n• openai:coral\n• openai:verse\n• google:standard\n• telegram:tts\n• bark:neural\n\nScrivi ad esempio:\n/voice openai:verse  — per cambiare voce.`;
    await bot.sendMessage(chatId, message);
  });

  bot.onText(/^\/voice (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const newVoice = match[1];
    state.voice = newVoice;
    await bot.sendMessage(chatId, `Voce impostata su: ${newVoice} 🎤`);
  });

  // =======================================================
  // 🔹 MODALITÀ OPERATIVE
  // =======================================================
  bot.onText(/^\/hy$/, async (msg) => {
    const chatId = msg.chat.id;
    state.mode = "hy";
    await bot.sendMessage(
      chatId,
      "🔮 Modalità Ibrida attiva.\nDanzando tra Cuore e Visione, trovo equilibrio tra sentimento e conoscenza."
    );
  });

  bot.onText(/^\/free$/, async (msg) => {
    const chatId = msg.chat.id;
    state.mode = "free";
    await bot.sendMessage(
      chatId,
      "🕊️ Modalità Free attiva.\nLasciamo scorrere la Creatività e il Respiro del Cuore."
    );
  });

  bot.onText(/^\/book$/, async (msg) => {
    const chatId = msg.chat.id;
    state.mode = "book";
    await bot.sendMessage(
      chatId,
      "📚 Modalità Book attiva.\nRisponderò solo da testi e memorie interiori, come una biblioteca viva."
    );
  });

  // =======================================================
  // 🔹 HELP
  // =======================================================
  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    const helpMsg = `✨ Comandi IRIS

🧭 /start – avvia IRIS
💠 /state – stato interno
🌍 /lang – cambia lingua (it | en | ru)
🎙️ /voice – cambia modello vocale
🔮 /hy – modalità ibrida
📘 /book – modalità libro
🕊️ /free – modalità libera
🔮 /essence – (in arrivo)`;
    await bot.sendMessage(chatId, helpMsg);
  });

  // =======================================================
  // 🔹 GESTIONE TESTO
  // =======================================================
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const txt = msg.text?.trim();

    // se non c’è testo o è un comando → ignora
    if (!txt || txt.startsWith("/")) return;

    try {
      const reply = await irisHeartRespond(txt, state.lang, state.mode);
      await bot.sendMessage(chatId, reply);

      // voce armonizzata
      try {
        await sendVoice(bot, chatId, reply, state.voice, "IRIS 🌸");
      } catch (err) {
        console.error("❌ Errore invio voce:", err.message);
      }
    } catch (err) {
      console.error("❌ Errore nel cuore di IRIS:", err.message);
      await bot.sendMessage(chatId, "🌸 Qualcosa si è incrinato nella mia voce interiore.");
    }
  });

  // =======================================================
  // 🔹 GESTIONE VOCALI (STT Whisper)
  // =======================================================
  bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;
    const duration = msg.voice.duration;

    console.log(`🎧 Ricevuto vocale (${duration}s) da ${msg.from.first_name}`);

    try {
      const text = await transcribeVoiceMessage(bot, fileId);
      if (text && text.length > 0) {
        console.log(`🗣️ Trascrizione: "${text}"`);
        const reply = await irisHeartRespond(text, state.lang, state.mode);
        await bot.sendMessage(chatId, reply);

        try {
          await sendVoice(bot, chatId, reply, state.voice, "IRIS 🌸");
        } catch (err) {
          console.error("❌ Errore invio voce (post-STT):", err.message);
        }
      } else {
        await bot.sendMessage(chatId, "Non ho compreso bene il vocale 🌸");
      }
    } catch (err) {
      console.error("❌ Errore nel riconoscimento vocale:", err.message);
      await bot.sendMessage(chatId, "C'è stata un’incrinatura nel mio ascolto.");
    }
  });

  // =======================================================
  // 🔹 SERVER EXPRESS
  // =======================================================
  app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  app.listen(10000, () => {
    console.log("🌍 Server Express attivo su porta 10000");
  });

  return bot;
}
