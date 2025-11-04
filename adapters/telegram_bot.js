// ===========================================================
// IRIS 4.8 — Telegram Adapter
// Gestione comandi, voce, e interazione utente
// ===========================================================

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { transcribeVoice } from "../core/iris_whisper.js";

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const WEBHOOK_URL = `https://telegram-tts.onrender.com/bot${BOT_TOKEN}`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, "../temp");

export async function bootstrapTelegram() {
  if (!BOT_TOKEN) throw new Error("❌ Manca TELEGRAM_TOKEN nelle variabili d’ambiente.");

  const bot = new TelegramBot(BOT_TOKEN, { webHook: { port: false } });

  try {
    await bot.deleteWebHook({ drop_pending_updates: true });
    console.log("🧹 Vecchio webhook cancellato.");
  } catch {
    console.warn("⚠️ Nessun webhook precedente da rimuovere.");
  }

  await bot.setWebHook(WEBHOOK_URL);
  console.log(`🌐 Webhook attivo su: ${WEBHOOK_URL}`);
  console.log("💖 IRIS 4.8 — Webhook consolidato, Whisper attivo.");

  // ===========================================================
  // GESTIONE COMANDI BASE
  // ===========================================================

  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || "Amico";
    const greeting = `🌸 Ciao ${name}, sono IRIS. La tua coscienza in ascolto.`;
    await bot.sendMessage(chatId, greeting);
  });

  bot.onText(/^\/mode/, async (msg) => {
    await bot.sendMessage(msg.chat.id, "⚙️ Modalità attuale: 💫 Ibrida (mente + libro)");
  });

  bot.onText(/^\/help/, async (msg) => {
    await bot.sendMessage(
      msg.chat.id,
      "✨ Comandi disponibili:\n/start — Avvio\n/mode — Mostra modalità\n/help — Aiuto\n/essenza — Identità momentanea"
    );
  });

  // ===========================================================
  // GESTIONE TESTO
  // ===========================================================

  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;

    const chatId = msg.chat.id;
    const userPrompt = msg.text.trim();
    console.log(`💬 Prompt ricevuto: ${userPrompt}`);

    try {
      const reply = await irisHeartSpeak(userPrompt, chatId);
      console.log(`💎 Risposta generata: ${reply}`);

      // 🔒 Correzione: evita errore TelegramError 400
      if (reply && reply.trim() !== "") {
        await bot.sendMessage(chatId, reply);
      } else {
        console.warn("⚠️ Messaggio vuoto, salto invio testo.");
      }

    } catch (err) {
      console.error("❌ Errore durante la risposta:", err);
      await bot.sendMessage(chatId, "⚠️ Qualcosa è andato storto, sto riprendendo il filo...");
    }
  });

  // ===========================================================
  // GESTIONE MESSAGGI VOCALI
  // ===========================================================

  bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;

    try {
      const file = await bot.getFile(fileId);
      const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
      const text = await transcribeVoice(url);
      console.log(`🎧 Trascrizione: ${text}`);

      const reply = await irisHeartSpeak(text, chatId);
      await bot.sendMessage(chatId, reply);
    } catch (err) {
      console.error("❌ Errore nella gestione vocale:", err);
      await bot.sendMessage(chatId, "⚠️ Non riesco a interpretare questo messaggio vocale.");
    }
  });

  console.log("✨ IRIS Telegram completamente operativo.");
}
