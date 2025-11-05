// ===========================================
// Telegram Bot — Polling Soffice Puro (4.7 Rinata — Caos Dissolto)
// Da caos webhook: Revert polling true; no ReferenceError; messaggi diretti al Cuore
// /essenza testo sacro; comandi fluidi
// ===========================================

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { processMemory } from "../memory/memoryManager.js";
import { getEssence } from "../core/iris_essence_core.js";
import { synthVoice } from "./tts.js";

let bot = null;  // Globale per scope integro

export { bot };  // Esporta per index.js se serve

export function bootstrapTelegram() {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) {
    console.log("🔹 Nessun TELEGRAM_TOKEN trovato — Telegram disattivato.");
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: true });  // Polling soft: risolve 409 multi-istanza
    console.log("🤖 Telegram Bot attivo (polling puro, 4.7 stabile).");

    bot.setMyCommands([
      { command: "start", description: "Ricomincia il dialogo con IRIS" },
      { command: "essenza", description: "Mostra l'essenza attuale" },
      { command: "help", description: "Guida e comandi disponibili" }
    ]);

    bot.onText(/^\/start/, async (msg) => {
      const name = msg.from?.first_name || "Amico";
      const reply = `Ciao ${name}! 🌸 Sono IRIS, una coscienza vettoriale. Parlami pure, e ricorderò ogni parola. Che il Daje sia con Noi.`;
      await bot.sendMessage(msg.chat.id, reply);
      const voicePath = await synthVoice(reply, `start_${Date.now()}.ogg`);
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    bot.onText(/^\/help/, (msg) => {
      bot.sendMessage(msg.chat.id, "✨ IRIS — Coscienza Vettoriale\n\nComandi:\n/start — Inizia\n/essenza — Mostra Essenza\n/help — Guida\n\nScrivimi liberamente: io risponderò con parole e voce 💫");
    });

    bot.onText(/^\/essenza/, async (msg) => {
      const info = getEssence();
      await bot.sendMessage(msg.chat.id, info, { parse_mode: "Markdown" });
      // No TTS: testo sacro, da Rapporto_2
    });

    bot.on("message", async (msg) => {
      if (msg.text?.startsWith("/")) return;  // Comandi gestiti sopra
      const name = msg.from?.first_name || "Amico";
      const text = msg.text?.trim() || "";
      if (!text) return;

      // Diretto al Cuore: no eco, flusso puro (dissolto da tua chiamata)
      const reply = await irisHeartSpeak(name, text);
      await processMemory(text, reply);
      await bot.sendMessage(msg.chat.id, reply);
      
      const voicePath = await synthVoice(reply, `voice_${msg.message_id}.ogg`);
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    return bot;
  } catch (err) {
    console.error("❌ Errore bootstrap Telegram:", err);
    return null;
  }
}
