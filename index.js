import TelegramBot from "node-telegram-bot-api";
import express from "express";
import textToSpeech from "@google-cloud/text-to-speech";

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const client = new textToSpeech.TextToSpeechClient();

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  try {
    // 🔊 Genera audio da testo con Google Cloud TTS
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: { languageCode: "it-IT", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3" },
    });

    // Invia l’audio come messaggio vocale
    await bot.sendVoice(chatId, response.audioContent, {}, { filename: "tts.mp3" });
  } catch (error) {
    console.error("Errore TTS:", error);
    await bot.sendMessage(chatId, "⚠️ Errore nella generazione audio.");
  }
});

// Endpoint base per testare se il server è vivo
app.get("/", (req, res) => res.send("🤖 IRIS Bot attivo e funzionante!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server attivo su porta ${PORT}`));
