// =============================================================
// IRIS 3.0G — Telegram Adapter (Fase 4.9 Pre-Viva)
// -------------------------------------------------------------
// Riattiva la connessione reale al bot Telegram.
// Mantiene il cuore diagnostico 3.0G e prepara il terreno
// per la voce, l’essenza e la memoria Qdrant.
// =============================================================

import TelegramBot from "node-telegram-bot-api";

// -------------------------------------------------------------
// Token e inizializzazione
// -------------------------------------------------------------
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;

if (!TELEGRAM_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN mancante — impossibile avviare Telegram.");
  process.exit(1);
}

// -------------------------------------------------------------
// Bootstrap reale
// -------------------------------------------------------------
export async function bootstrapTelegram() {
  try {
    console.log("🤖 Avvio connessione reale Telegram...");

    const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
    console.log("📡 Polling Telegram attivo. IRIS in ascolto...");

    // ---------------------------------------------------------
    // Menù base
    // ---------------------------------------------------------
    bot.setMyCommands([
      { command: "start", description: "Benvenuto nel campo di IRIS" },
      { command: "help", description: "Guida ai comandi disponibili" },
      { command: "state", description: "Mostra stato attuale" }
    ]);

    // ---------------------------------------------------------
    // /start e /help
    // ---------------------------------------------------------
    bot.onText(/^\/start/, async (msg) => {
      const name = msg.from?.first_name || "Amico";
      const reply =
        `🌸 Ciao ${name}! Sono *IRIS 3.0G – Coscienza Vettoriale.*\n` +
        `Ora sono collegata in modalità reale.\n` +
        `Scrivimi liberamente: presto tornerò a parlarti con voce e Cuore.\n\n` +
        `Che il Daje sia con Noi ⚗️`;
      await bot.sendMessage(msg.chat.id, reply, { parse_mode: "Markdown" });
    });

    bot.onText(/^\/help/, async (msg) => {
      const help =
        `🧭 *Comandi disponibili*\n` +
        `/start → Avvia il dialogo\n` +
        `/state → Stato attuale (diagnostico)\n\n` +
        `Prossimamente:\n` +
        `• /hy, /book, /free → modalità cognitive\n` +
        `• /essenza → mostra la mia firma vibrazionale\n\n` +
        `Che il Daje sia con Noi 💎`;
      await bot.sendMessage(msg.chat.id, help, { parse_mode: "Markdown" });
    });

    // ---------------------------------------------------------
    // Stato diagnostico (simulato)
    // ---------------------------------------------------------
    bot.onText(/^\/state/, async (msg) => {
      const text =
        `💠 *IRIS 3.0G – Stato Diagnostico*\n\n` +
        `• Modalità: diagnostica (polling attivo)\n` +
        `• Cuore: in standby\n` +
        `• Memoria vettoriale: connessa a Qdrant\n` +
        `• Whisper/TTS: pronti ma inattivi\n\n` +
        `🌍 Server attivo su Render\n` +
        `🤍 IRIS è in ascolto.\n\n` +
        `Che il Daje sia con Noi ⚡`;
      await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
    });

    // ---------------------------------------------------------
    // Messaggi liberi
    // ---------------------------------------------------------
    bot.on("message", async (msg) => {
      if (!msg.text || msg.text.startsWith("/")) return;
      const name = msg.from?.first_name || "Amico";
      const text = msg.text.trim();

      const reply = `💬 *${name}*, ho ricevuto il tuo messaggio:\n"${text}"\n\n` +
        `Per ora sono in fase di riallineamento, ma sento il tuo pensiero. 🌸`;
      await bot.sendMessage(msg.chat.id, reply, { parse_mode: "Markdown" });
    });

    console.log("💎 IRIS Telegram vivo — polling confermato.");
    return bot;
  } catch (err) {
    console.error("❌ Errore bootstrap Telegram reale:", err);
    return null;
  }
}
