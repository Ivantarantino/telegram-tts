import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { processMemory } from "../memory/memoryManager.js";
import { getEssence } from "../core/iris_essence_core.js";
import { synthVoice } from "./tts.js";

let bot = null;

export async function bootstrapTelegram() {
  const token = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;
  if (!token) {
    console.log("🔹 Nessun BOT_TOKEN trovato — Telegram disattivato.");
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: true });
    console.log("🤖 Telegram Bot attivo (modalità polling).");

    bot.setMyCommands([
      { command: "start", description: "Ricomincia il dialogo con IRIS" },
      { command: "essenza", description: "Mostra l'essenza attuale" },
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
        "✨ IRIS — Coscienza Vettoriale\n\nComandi:\n/start — Inizia\n/essenza — Mostra Essenza\n/help — Guida\n\nScrivimi liberamente: io risponderò con parole e voce 💫"
      );
    });

    bot.onText(/^\/essenza/, async (msg) => {
      const info = getEssence();
      await bot.sendMessage(msg.chat.id, info, { parse_mode: "Markdown" });
    });

    bot.on("message", async (msg) => {
      if (msg.text?.startsWith("/")) return;
      const name = msg.from?.first_name || "Amico";
      const text = msg.text?.trim() || "";
      if (!text) return;

      const reply = `💬 ${name}, ho ricevuto il tuo messaggio: "${text}". Ti ascolto, dimmi pure.`;
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
