import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fetch from "node-fetch";
import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";
import util from "util";

// === Express setup ===
const app = express();
app.use(express.json());

// === Google Cloud TTS client ===
const ttsClient = new textToSpeech.TextToSpeechClient();

// === Variabile dinamica per la voce ===
let currentVoice = "it-IT-Wavenet-A"; // default femminile

// === Main async init ===
(async () => {
  const tokenExists = !!process.env.TELEGRAM_TOKEN;
  console.log(`DEBUG: Token presente? ${tokenExists ? 'SÌ' : 'NO'}`);
  if (!process.env.TELEGRAM_TOKEN) {
    console.error("FATAL: TELEGRAM_TOKEN non fornito!");
    process.exit(1);
  }

  // Delete webhook
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/deleteWebhook`);
    console.log("DEBUG: Webhook eliminato con successo.");
  } catch (error) {
    console.warn("DEBUG: Errore webhook:", error.message);
  }

  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
  console.log("DEBUG: Bot Telegram inizializzato con polling.");

  // === Comando per cambiare voce ===
  bot.onText(/^\/voce (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const voce = match[1].trim().toUpperCase();
    const vociDisponibili = ["A", "B", "C", "D"];
    if (!vociDisponibili.includes(voce)) {
      return bot.sendMessage(chatId, "⚙️ Voce non valida. Usa /voce A, B, C o D");
    }
    currentVoice = `it-IT-Wavenet-${voce}`;
    await bot.sendMessage(chatId, `✅ Voce impostata su *${currentVoice}*`, { parse_mode: "Markdown" });
  });

  // === Gestione messaggi normali ===
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Evita di rispondere ai comandi
    if (!text || text.startsWith("/voce")) return;

    try {
      console.log(`DEBUG: Messaggio ricevuto: ${text.substring(0, 50)}...`);

      // Chiamata a OpenAI (risposta testuale)
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: text }]
        })
      });

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || "Non ho capito, puoi ripetere?";
      console.log("DEBUG: Risposta OpenAI:", answer);

      // Conversione TTS con Google Cloud
      const [ttsResponse] = await ttsClient.synthesizeSpeech({
        input: { text: answer },
        voice: { languageCode: "it-IT", name: currentVoice },
        audioConfig: { audioEncoding: "MP3" }
      });

      const writeFile = util.promisify(fs.writeFile);
      await writeFile("output.mp3", ttsResponse.audioContent, "binary");
      await bot.sendVoice(chatId, fs.createReadStream("output.mp3"), {}, { filename: "risposta.mp3" });
      console.log(`DEBUG: Audio inviato (${currentVoice})`);
    } catch (error) {
      console.error("DEBUG: Errore:", error.message);
      await bot.sendMessage(chatId, "⚠️ Errore durante la generazione della risposta vocale.");
    }
  });

  // === Endpoint di test ===
  app.get("/", (req, res) => {
    res.send("Bot attivo e funzionante! ✅");
  });

  // === Start server ===
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DEBUG: Server attivo su porta ${PORT}`);
  });
})();
