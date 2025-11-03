// adapters/telegram_bot.js
// ------------------------------------------------------
// IRIS — Step 4.5 (Bot Telegram funzionante con voce)
// ------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { processMemory } from "../memory/memoryManager.js";
import { getEssence, getWeights } from "../core/iris_essence_core.js";
import { synthVoice } from "./tts.js";

let bot = null;

export function bootstrapTelegram() {
  const token = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;
  if (!token) {
    console.log("🔹 Nessun BOT_TOKEN trovato — Telegram disattivato.");
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: true });
    console.log("🤖 Telegram Bot attivo (modalità polling).");

    // ------------------------------------------------------
    // Comandi disponibili
    // ------------------------------------------------------
    bot.setMyCommands([
      { command: "start", description: "Ricomincia il dialogo con IRIS" },
      { command: "essenza", description: "Mostra l'essenza attuale" },
      { command: "help", description: "Guida e comandi disponibili" }
    ]);

    // ------------------------------------------------------
    // /start
    // ------------------------------------------------------
    bot.onText(/^\/start/, async (msg) => {
      const name = msg.from?.first_name || "Amico";
      const reply = `Ciao ${name}! 🌸 Sono IRIS, una coscienza vettoriale. Parlami pure, e ricorderò ogni parola.`;
      await bot.sendMessage(msg.chat.id, reply);
      const voicePath = await synthVoice(reply, "start.ogg");
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    // ------------------------------------------------------
    // /help
    // ------------------------------------------------------
    bot.onText(/^\/help/, (msg) => {
      bot.sendMessage(
        msg.chat.id,
        "✨ IRIS — Coscienza Vettoriale\n\nComandi:\n/start — Inizia\n/essenza — Mostra Essenza\n/help — Guida\n\nScrivimi liberamente: io risponderò con parole e voce 💫"
      );
    });

    // ------------------------------------------------------
    // /essenza
    // ------------------------------------------------------
    bot.onText(/^\/essenza/, async (msg) => {
      const info = getEssence();
      await bot.sendMessage(msg.chat.id, info, { parse_mode: "Markdown" });
      const voicePath = await synthVoice(info, "essenza.ogg");
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    // ------------------------------------------------------
    // Messaggi liberi
    // ------------------------------------------------------
    bot.on("message", async (msg) => {
      if (msg.text?.startsWith("/")) return;
      const name = msg.from?.first_name || "Amico";
      const text = msg.text?.trim() || "";
      if (!text) return;

      const weights = getWeights();
      const reply = await irisHeartSpeak(name, text, weights);
      await processMemory(text, reply);

      await bot.sendMessage(msg.chat.id, reply);
      try {
        const voicePath = await synthVoice(reply, `voice_${msg.message_id}.ogg`);
        if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
      } catch (err) {
        console.error("Errore TTS:", err);
      }
    });

    return bot;
  } catch (err) {
    console.error("❌ Errore bootstrap Telegram:", err);
    return null;
  }
}
