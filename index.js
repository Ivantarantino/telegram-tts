import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fetch from "node-fetch";

// === Express setup ===
const app = express();
app.use(express.json());

// === Main async init ===
(async () => {
  // ✅ Controllo variabile d'ambiente
  const tokenExists = !!process.env.TELEGRAM_TOKEN;
  console.log(`DEBUG: Token presente? ${tokenExists ? 'SÌ' : 'NO'}`);
  if (!process.env.TELEGRAM_TOKEN) {
    console.error("FATAL: TELEGRAM_TOKEN non fornito!");
    process.exit(1);
  }

  // ✅ Elimina eventuale webhook precedente
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/deleteWebhook`);
    console.log("DEBUG: Webhook eliminato con successo.");
  } catch (error) {
    console.warn("DEBUG: Errore eliminazione webhook:", error.message);
  }

  // ✅ Crea il bot
  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
  console.log("DEBUG: Bot Telegram inizializzato con polling.");

  // === BOT LISTENER ===
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    console.log(`DEBUG: Messaggio ricevuto → ${text}`);

    try {
      // === Chiamata all’endpoint VAPI ===
      const response = await fetch("https://api.vapi.ai/v1/tools/976b772d-bd7a-4f31-a8c5-8344a2c542d3/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.VAPI_KEY}`, // 👈 Variabile d’ambiente con la tua chiave VAPI
        },
        body: JSON.stringify({ text }),
      });

      console.log("DEBUG: Richiesta TTS inviata a VAPI.");

      if (!response.ok) {
        throw new Error(`Errore TTS → Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("DEBUG: Risposta ricevuta da VAPI:", data);

      if (!data.audio_url) {
        throw new Error("Nessun audio ricevuto da VAPI.");
      }

      // === Conversione da Base64 a buffer vocale ===
      const base64Audio = data.audio_url.replace(/^data:audio\/mp3;base64,/, "");
      const audioBuffer = Buffer.from(base64Audio, "base64");

      // === Invio vocale su Telegram ===
      await bot.sendVoice(chatId, audioBuffer, {}, { filename: "tts.mp3" });
      console.log("DEBUG: Audio inviato con successo ✅");

    } catch (error) {
      console.error("DEBUG: Errore nella generazione o invio audio:", error.message);
      await bot.sendMessage(chatId, "⚠️ Errore nella generazione audio. Riprova!");
    }
  });

  // === ENDPOINT DI STATO ===
  app.get("/", (req, res) => {
    console.log("DEBUG: Richiesta su / ricevuta.");
    res.send("Bot attivo e funzionante! ✅");
  });

  // === AVVIO SERVER EXPRESS ===
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DEBUG: Server attivo su porta ${PORT}`);
  });
})();
