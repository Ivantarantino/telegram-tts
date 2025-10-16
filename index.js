import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fetch from "node-fetch";
import googleTTS from "google-tts-api";

// === Express setup ===
const app = express();
app.use(express.json());

// === Main async init ===
(async () => {
  // Debug: Controllo token (non stampa il valore reale)
  const tokenExists = !!process.env.TELEGRAM_TOKEN;
  console.log(`DEBUG: Token presente? ${tokenExists ? 'SÌ' : 'NO'}`);
  if (!process.env.TELEGRAM_TOKEN) {
    console.error("FATAL: TELEGRAM_TOKEN non fornito!");
    process.exit(1);
  }
  console.log("DEBUG: Token caricato con successo (lunghezza:", process.env.TELEGRAM_TOKEN.length, ").");

  // Auto delete webhook
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/deleteWebhook`);
    console.log("DEBUG: Webhook eliminato con successo.");
  } catch (error) {
    console.warn("DEBUG: Errore webhook:", error.message);
  }

  // Create bot
  try {
    const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
    console.log("DEBUG: Bot Telegram inizializzato con polling.");
    
    // === Bot Listener ===
    bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
      if (!text) return;
      try {
        console.log(`DEBUG: Messaggio ricevuto: ${text.substring(0, 50)}...`);
        const response = await fetch("https://telegram-tts.onrender.com/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!response.ok) throw new Error(`TTS: ${response.status}`);
        const data = await response.json();
        if (!data.audio_url) throw new Error("No audio");
        const base64Audio = data.audio_url.replace(/^data:audio\/mp3;base64,/, "");
