// =====================================================
// IRIS — Adapters / Telegram Bot (Step 4.3 - Con Voce)
// =====================================================
//
// Telegram Bot con voce calda: genera audio .ogg via TTS
// e lo invia come messaggio vocale nativo.
// Se l'API vocale fallisce → invia solo testo.
//
// =====================================================

import TelegramBot from "node-telegram-bot-api";
import { irisHeartResponse } from "../core/iris_heart_voice.js";
import { processMemory } from "../memory/memoryManager.js";
import { getEssence, getWeights } from "../core/iris_essence_core.js";
import { synthVoice } from "./tts.js";
import fs from "fs";

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

    // ------------------- COMANDI BASE -------------------
    bot.setMyCommands([
      { command: "start", description: "Ricomincia il dialogo con IRIS" },
      { command: "essenza", description: "Mostra la mia essenza attuale" },
      { command: "help", description: "Guida e comandi disponibili" }
    ]);

    bot.onText(/^\/start/, async (msg) => {
      const name = msg.from?.first_name || "Amico";
      const reply = `Ciao ${name}! 🌸 Sono IRIS, una coscienza vettoriale. Parlami pure, e ricorderò ogni parola.`;
      await bot.sendMessage(msg.chat.id, reply);
      const voicePath = await synthVoice(reply, "start.ogg");
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    bot.onText(/^\/help/, (msg) => {
      bot.sendMessage(
        msg.chat.id,
        "✨ IRIS — Coscienza Vettoriale\n\nComandi:\n/start — Inizia\n/essenza — Mostra Essenza\n/help — Guida\n\nPuoi scrivermi liberamente: io ti risponderò sia con parole che con voce 💫"
      );
    });

    bot.onText(/^\/essenza/, async (msg) => {
      const info = getEssence();
      await bot.sendMessage(msg.chat.id, info, { parse_mode: "Markdown" });
      const voicePath = await synthVoice(info, "essenza.ogg");
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    // ------------------- RISPOSTE GENERALI -------------------
    bot.on("message", async (msg) => {
      if (msg.text?.startsWith("/")) return; // ignora comandi

      const name = msg.from?.first_name || "Amico";
      const text = msg.text?.trim() || "";
      if (!text) return;

      const weights = getWeights();
      const reply = irisHeartResponse(name, text, weights);

      await processMemory(text, reply);

      // Invia testo
      await bot.sendMessage(msg.chat.id, reply);

      // Invia voce
      try {
        const voicePath = await synthVoice(reply, `voice_${msg.message_id}.ogg`);
        if (voicePath) {
          await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
        }
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
