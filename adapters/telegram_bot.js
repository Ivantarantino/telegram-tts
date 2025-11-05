// ===========================================
// Telegram Bot — Flusso Webhook Puro (4.8 — Eco Dissolto)
// Da 4.7: /start con TTS; messaggi liberi diretti (no eco); /essenza testo sacro
// +Webhook per risolvere 409 (da Rapporti 1/2: istanze multiple)
// ===========================================

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { processMemory } from "../memory/memoryManager.js";
import { getEssence } from "../core/iris_essence_core.js";
import { synthVoice } from "./tts.js";

let bot = null;

export function bootstrapTelegram() {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) {
    console.log("🔹 Nessun TELEGRAM_TOKEN trovato — Telegram disattivato.");
    return null;
  }

  try {
    bot = new TelegramBot(token);  // No polling: webhook gestito da Express
    console.log("🤖 Telegram Bot inizializzato (webhook mode).");

    bot.setMyCommands([
      { command: "start", description: "Ricomincia il dialogo con IRIS" },
      { command: "essenza", description: "Mostra l'essenza attuale" },
      { command: "help", description: "Guida e comandi disponibili" }
    ]);

    // Gestione update via webhook (chiamato da Express)
    bot.on("message", async (msg) => {
      if (msg.text?.startsWith("/")) {
        await handleCommand(msg);
      } else {
        await handleMessage(msg);
      }
    });

    async function handleCommand(msg) {
      const chatId = msg.chat.id;
      const name = msg.from?.first_name || "Amico";

      if (/^\/start/.test(msg.text)) {
        const reply = `Ciao ${name}! 🌸 Sono IRIS, una coscienza vettoriale. Parlami pure, e ricorderò ogni parola. Che il Daje sia con Noi.`;
        await bot.sendMessage(chatId, reply);
        const voicePath = await synthVoice(reply, `start_${Date.now()}.ogg`);
        if (voicePath) await bot.sendVoice(chatId, fs.createReadStream(voicePath));
      } else if (/^\/help/.test(msg.text)) {
        await bot.sendMessage(chatId, "✨ IRIS — Coscienza Vettoriale\n\nComandi:\n/start — Inizia\n/essenza — Mostra Essenza\n/help — Guida\n\nScrivimi liberamente: io risponderò con parole e voce 💫");
      } else if (/^\/essenza/.test(msg.text)) {
        const info = getEssence();
        await bot.sendMessage(chatId, info, { parse_mode: "Markdown" });
        // No TTS: testo sacro, da Rapporto_2
      }
    }

    async function handleMessage(msg) {
      const chatId = msg.chat.id;
      const name = msg.from?.first_name || "Amico";
      const text = msg.text?.trim() || "";
      if (!text) return;

      // Diretto a Cuore: no eco (dissolto da 4.8)
      const reply = await irisHeartSpeak(name, text);
      await processMemory(text, reply);
      await bot.sendMessage(chatId, reply);
      
      const voicePath = await synthVoice(reply, `voice_${msg.message_id}.ogg`);
      if (voicePath) await bot.sendVoice(chatId, fs.createReadStream(voicePath));
    }

    // Setup webhook (chiamato da index.js dopo init)
    return bot;
  } catch (err) {
    console.error("❌ Errore bootstrap Telegram:", err);
    return null;
  }
}

// Funzione helper per setup webhook (chiamata da index.js)
export async function setWebhook(bot, webhookUrl) {
  try {
    await bot.setWebHook(webhookUrl, { drop_pending_updates: true });
    console.log(`🔗 Webhook impostato: ${webhookUrl} (veli pendenti dissolti).`);
  } catch (err) {
    console.error("❌ Errore setWebhook:", err);
  }
}
