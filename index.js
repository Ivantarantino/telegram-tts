// index.js — IRIS 3.0i — versione stabile con TTS OGG + gestione fallback
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import express from "express";
import { chatWithIris, getMode, setMode, essence } from "./ragSearch.js";
import { generateVoice } from "./tts.js";

const app = express();
const PORT = process.env.PORT || 10000;

const token =
  process.env.TELEGRAM_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.TELEGRAM_API_TOKEN;

if (!token) {
  console.error("❌ ERRORE FATALE: nessun token Telegram trovato!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// 🌐 server per Render
app.get("/", (req, res) => res.send("🌍 IRIS attiva su Render."));
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
});

// 🧭 Modalità corrente
console.log(`🧭 Modalità iniziale: ${getMode().toUpperCase()} MODE`);

// 📩 Gestione messaggi Telegram
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : "";

  try {
    if (!text) {
      await bot.sendMessage(chatId, "🕊️ Messaggio vuoto ricevuto.");
      return;
    }

    // 🔄 Comandi di controllo
    if (text.toLowerCase() === "/start") {
      await bot.sendMessage(
        chatId,
        "Ciao Ivano 🌿, sono IRIS. Modalità attuale: " + getMode().toUpperCase()
      );
      return;
    }

    if (text.startsWith("/mode")) {
      const newMode = text.split(" ")[1];
      if (["hy", "book", "free"].includes(newMode)) {
        setMode(newMode);
        await bot.sendMessage(chatId, `🔁 Modalità impostata su ${newMode.toUpperCase()}.`);
      } else {
        await bot.sendMessage(chatId, "Modalità non valida. Usa: /mode hy | book | free");
      }
      return;
    }

    if (text.toLowerCase().includes("/essence")) {
      const ess = await essence();
      await bot.sendMessage(chatId, ess);
      return;
    }

    // 💬 Risposta IRIS
    const reply = await chatWithIris(text);

    if (!reply || typeof reply !== "string") {
      await bot.sendMessage(chatId, "⚠️ Errore nella risposta di IRIS.");
      return;
    }

    // 🔊 Genera voce .ogg
    const voiceFile = await generateVoice(reply);

    if (voiceFile && fs.existsSync(voiceFile)) {
      await bot.sendVoice(chatId, fs.createReadStream(voiceFile));
      fs.unlinkSync(voiceFile); // pulizia temp
    } else {
      await bot.sendMessage(chatId, reply);
    }
  } catch (err) {
    console.error("❌ Errore in Telegram handler:", err);
    await bot.sendMessage(chatId, "⚠️ Errore interno. Riprova tra poco.");
  }
});
