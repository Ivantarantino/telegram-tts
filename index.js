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
        const audioBuffer = Buffer.from(base64Audio, "base64");
        await bot.sendVoice(chatId, audioBuffer, {}, { filename: "tts.mp3" });
        console.log("DEBUG: Audio inviato con successo.");
      } catch (error) {
        console.error("DEBUG: Errore bot:", error.message);
        await bot.sendMessage(chatId, "⚠️ Errore audio. Riprova!");
      }
    });
  } catch (error) {
    console.error("FATAL: Errore init bot:", error.message);
    process.exit(1);
  }

  // === TTS Endpoint ===
  app.post("/tts", async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Testo mancante" });
    }
    try {
      console.log(`DEBUG: Richiesta TTS per: ${text.substring(0, 50)}...`);

      // ✅ nuova sintassi google-tts-api
      const url = googleTTS.getAudioUrl(text, { lang: "it", slow: false });
      const audioResponse = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (!audioResponse.ok) throw new Error(`TTS fetch failed (${audioResponse.status})`);
      const audioBuffer = await audioResponse.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString("base64");
      res.json({ audio_url: `data:audio/mp3;base64,${base64Audio}` });
    } catch (error) {
      console.error("DEBUG: Errore TTS:", error.message);
      res.status(500).json({ error: "Generazione audio fallita" });
    }
  });

  // === Health check con debug ===
  app.get("/", (req, res) => {
    console.log("DEBUG: Richiesta su / ricevuta.");
    res.send("Bot attivo e funzionante! ✅");
  });

  // === Start server ===
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DEBUG: Server attivo su porta ${PORT} (host 0.0.0.0)`);
  });
})();
