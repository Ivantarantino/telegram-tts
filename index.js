import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fetch from "node-fetch";

// === Express setup ===
const app = express();
app.use(express.json());

// === Auto delete webhook to avoid 409 conflict ===
await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/deleteWebhook`);

// === Create Telegram bot ===
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// === Telegram listener ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  try {
    const response = await fetch("https://telegram-tts.onrender.com/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!data.audio_url) {
      throw new Error("No audio generated from TTS endpoint");
    }

    const base64Audio = data.audio_url.replace(/^data:audio\/mp3;base64,/, "");
    const audioBuffer = Buffer.from(base64Audio, "base64");

    await bot.sendVoice(chatId, audioBuffer, {}, { filename: "tts.mp3" });
  } catch (error) {
    console.error("Errore TTS:", error);
    await bot.sendMessage(chatId, "⚠️ Errore nella generazione audio.");
  }
});

// === Server ===
app.get("/", (req, res) => res.send("Bot attivo e funzionante!"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server attivo su porta ${PORT}`));
