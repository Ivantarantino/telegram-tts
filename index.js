import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;

// === FIX 409: disattiva sempre vecchi webhook prima del polling ===
async function clearWebhook() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`);
    const data = await res.json();
    console.log("DEBUG: deleteWebhook →", data);
  } catch (err) {
    console.error("DEBUG: Errore deleteWebhook:", err.message);
  }
}

(async () => {
  if (!TOKEN) {
    console.error("FATAL: TELEGRAM_TOKEN non fornito!");
    process.exit(1);
  }

  await clearWebhook();

  const bot = new TelegramBot(TOKEN, { polling: true });
  console.log("✅ Bot avviato con polling unico");

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    try {
      console.log("DEBUG: Messaggio ricevuto:", text);

      // === Chiama il TTS endpoint esistente su Render ===
      const response = await fetch("https://telegram-tts.onrender.com/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error(`TTS Error ${response.status}`);

      const data = await response.json();
      const base64Audio = data.audio_url.replace(/^data:audio\/mp3;base64,/, "");
      const audioBuffer = Buffer.from(base64Audio, "base64");

      await bot.sendVoice(chatId, audioBuffer, {}, { filename: "tts.mp3" });
      console.log("✅ Audio inviato con successo");
    } catch (err) {
      console.error("Errore TTS:", err.message);
      await bot.sendMessage(chatId, "⚠️ Errore nella generazione audio.");
    }
  });

  app.get("/", (req, res) => res.send("Bot attivo e funzionante! ✅"));
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, () => console.log(`🌐 Server attivo su porta ${PORT}`));
})();
