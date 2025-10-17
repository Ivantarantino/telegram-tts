import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import util from "util";
import textToSpeech from "@google-cloud/text-to-speech";
import OpenAI from "openai";

const app = express();

// === VARIABILI D'AMBIENTE ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!TELEGRAM_TOKEN || !OPENAI_API_KEY || !GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("❌ Errore: variabili d'ambiente mancanti!");
  process.exit(1);
}

// === INIZIALIZZAZIONI ===
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const client = new textToSpeech.TextToSpeechClient();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// === IMPOSTAZIONI DI DEFAULT ===
let lingua = "it-IT";
let voce = "it-IT-Standard-B"; // voce femminile calda e naturale
let velocita = 1.0;

// === COMANDI TELEGRAM ===
bot.onText(/^\/voce (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const scelta = match[1].trim().toUpperCase();
  const voci = {
    A: "it-IT-Standard-A",
    B: "it-IT-Standard-B",
    C: "it-IT-Standard-C",
    D: "it-IT-Standard-D",
  };

  if (voci[scelta]) {
    voce = voci[scelta];
    bot.sendMessage(chatId, `✅ Voce impostata su ${voce}`);
  } else {
    bot.sendMessage(chatId, "❌ Scelta non valida. Usa /voce A|B|C|D");
  }
});

bot.onText(/^\/lingua (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const nuovaLingua = match[1].trim();
  const lingueSupportate = ["it-IT", "en-US", "es-ES", "ru-RU"];

  if (lingueSupportate.includes(nuovaLingua)) {
    lingua = nuovaLingua;
    bot.sendMessage(chatId, `🌐 Lingua impostata su ${lingua}`);
  } else {
    bot.sendMessage(chatId, "❌ Lingua non valida. Usa it-IT, en-US, es-ES o ru-RU.");
  }
});

bot.onText(/^\/stato/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `🧭 Stato attuale:\nLingua: ${lingua}\nVoce: ${voce}\nVelocità: ${velocita}`
  );
});

// === GESTIONE DEI MESSAGGI ===
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    bot.sendChatAction(chatId, "typing");

    // === Chiamata a OpenAI ===
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: text }],
    });

    const reply = response.choices[0].message.content;
    console.log(`🗣️ Richiesta: ${text}\nRisposta: ${reply}`);

    // === Sintesi vocale (Google Cloud TTS) ===
    const request = {
      input: { text: reply },
      voice: { languageCode: lingua, name: voce },
      audioConfig: { audioEncoding: "OGG_OPUS", speakingRate: velocita },
    };

    const [ttsResponse] = await client.synthesizeSpeech(request);
    const writeFile = util.promisify(fs.writeFile);
    const audioFile = `tts_${Date.now()}.ogg`;

    await writeFile(audioFile, ttsResponse.audioContent, "binary");
    await bot.sendVoice(chatId, fs.createReadStream(audioFile));

    fs.unlinkSync(audioFile);
  } catch (err) {
    console.error("❌ Errore:", err);
    bot.sendMessage(msg.chat.id, "Errore durante l'elaborazione della risposta.");
  }
});

// === SERVER EXPRESS ===
const PORT = process.env.PORT || 10000;
app.get("/", (req, res) => res.send("IRIS è attiva e funzionante 🔮"));
app.listen(PORT, () => console.log(`🚀 Server avviato sulla porta ${PORT}`));
