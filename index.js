// === Fix warning Telegram ===
process.env.NTBA_FIX_350 = '1';

// === Import principali ===
import express from "express";
import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";

// === Inizializzazione Express ===
const app = express();
app.use(express.json());

// === Configurazione TTS Client ===
const ttsClient = new textToSpeech.TextToSpeechClient();

// === Variabili d'ambiente ===
const TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;

// === File locale per salvare la voce scelta ===
const VOICE_FILE = "./voce.json";
let voceCorrente = "it-IT-Wavenet-D"; // default: femminile naturale

if (fs.existsSync(VOICE_FILE)) {
  voceCorrente = JSON.parse(fs.readFileSync(VOICE_FILE)).voce || voceCorrente;
}

// === Controllo token ===
if (!TOKEN) {
  console.error("❌ ERRORE: manca TELEGRAM_TOKEN nelle variabili d'ambiente!");
  process.exit(1);
} else {
  console.log("DEBUG: Token caricato con successo ✅");
}

// === Elimina webhook precedente ===
try {
  await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`);
  console.log("DEBUG: Webhook eliminato con successo.");
} catch (err) {
  console.error("⚠️ Errore durante deleteWebhook:", err.message);
}

// === Inizializza bot in polling ===
const bot = new TelegramBot(TOKEN, { polling: true });
console.log("DEBUG: Bot Telegram inizializzato con polling.");

// === Endpoint principale TTS ===
app.post("/tts", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Testo mancante" });

  console.log(`DEBUG: Richiesta TTS per: ${text} (voce: ${voceCorrente})`);

  try {
    const request = {
      input: { text },
      voice: { languageCode: "it-IT", name: voceCorrente, ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3" },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    const base64Audio = response.audioContent.toString("base64");
    res.json({ audio_url: `data:audio/mp3;base64,${base64Audio}` });
  } catch (err) {
    console.error("DEBUG: Errore Google TTS:", err);
    res.status(500).json({ error: "Errore durante la generazione dell'audio" });
  }
});

// === Gestione comandi e messaggi Telegram ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  // Comando per cambiare voce
  if (text.startsWith("/voce")) {
    const code = text.split(" ")[1]?.toUpperCase();
    const vociDisponibili = ["A", "B", "C", "D"];
    if (!code || !vociDisponibili.includes(code)) {
      return bot.sendMessage(
        chatId,
        "🔊 Usa /voce [A|B|C|D]\nEsempio: /voce C"
      );
    }

    voceCorrente = `it-IT-Wavenet-${code}`;
    fs.writeFileSync(VOICE_FILE, JSON.stringify({ voce: voceCorrente }));
    bot.sendMessage(chatId, `✅ Voce cambiata in: ${voceCorrente}`);
    return;
  }

  // Gestione messaggi normali
  console.log(`DEBUG: Messaggio ricevuto: ${text}`);

  try {
    const response = await fetch("https://telegram-tts.onrender.com/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) throw new Error(`TTS HTTP ${response.status}`);

    const { audio_url } = await response.json();
    const base64Audio = audio_url.replace(/^data:audio\/mp3;base64,/, "");

    await bot.sendVoice(chatId, Buffer.from(base64Audio, "base64"), {}, { filename: "tts.mp3" });
    console.log("DEBUG: Audio inviato con successo ✅");
  } catch (error) {
    console.error("DEBUG: Errore bot:", error);
    bot.sendMessage(chatId, "⚠️ Errore durante la generazione dell'audio. Riprova più tardi.");
  }
});

// === Endpoint base per test ===
app.get("/", (req, res) => {
  console.log("DEBUG: Richiesta su / ricevuta.");
  res.send("✅ Server TTS attivo.");
});

// === Avvio server ===
app.listen(PORT, "0.0.0.0", () => {
  console.log(`DEBUG: Server attivo su porta ${PORT}`);
});
