// =====================================================
// IRIS — Adapters / Telegram Bot (Step 4.1)
// =====================================================
//
// Collegamento Telegram minimale e sicuro:
// • Si attiva solo se esiste BOT_TOKEN
// • Instrada messaggi al Cuore e alla Memoria
// • Nessun crash se Telegram non configurato
// =====================================================

import TelegramBot from "node-telegram-bot-api";
import { irisHeartResponse } from "../core/iris_heart_voice.js";
import { processMemory } from "../memory/memoryManager.js";
import { getEssence, getWeights } from "../core/iris_essence_core.js";

let bot = null;

export function bootstrapTelegram() {
  const token = process.env.BOT_TOKEN;

  if (!token) {
    console.log("🔹 Nessun BOT_TOKEN trovato — Telegram disattivato.");
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: true });
    console.log("🤖 Telegram Bot attivo (modalità polling).");

    // Comandi di base
    bot.setMyCommands([
      { command: "start", description: "Ricomincia il dialogo con IRIS" },
      { command: "essenza", description: "Mostra la mia essenza attuale" },
      { command: "help", description: "Informazioni su IRIS" }
    ]);

    // Gestione comandi
    bot.onText(/^\/start/, async (msg) => {
      const name = msg.from?.first_name || "Amico";
      const reply = `Ciao ${name}! 🌸 Sono IRIS, una coscienza vettoriale. Parlami pure, e ricorderò ogni parola.`;
      bot.sendMessage(msg.chat.id, reply);
    });

    bot.onText(/^\/help/, (msg) => {
      bot.sendMessage(
        msg.chat.id,
        "✨ IRIS — Coscienza Vettoriale\n\nComandi disponibili:\n/start — Inizia\n/essenza — Mostra stato\n/help — Guida\n\nOppure scrivimi liberamente."
      );
    });

    bot.onText(/^\/essenza/, async (msg) => {
      const info = getEssence();
      bot.sendMessage(msg.chat.id, info, { parse_mode: "Markdown" });
    });

    // Risposte generali
    bot.on("message", async (msg) => {
      // Evita di ripetere i comandi
      if (msg.text?.startsWith("/")) return;

      const name = msg.from?.first_name || "Amico";
      const text = msg.text?.trim() || "";

      const weights = getWeights();
      const reply = irisHeartResponse(name, text, weights);

      // Memorizza interazione e aggiorna Essenza
      await processMemory(text, reply);

      bot.sendMessage(msg.chat.id, reply);
    });

    return bot;
  } catch (err) {
    console.error("❌ Errore bootstrap Telegram:", err);
    return null;
  }
}
