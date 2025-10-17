import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import util from "util";
import textToSpeech from "@google-cloud/text-to-speech";
import OpenAI from "openai";

const app = express();

// === Variabili ambiente ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!TELEGRAM_TOKEN || !OPENAI_API_KEY || !GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("❌ Errore: variabili d'ambiente mancanti!");
  process.exit(1);
}

// === Inizializzazioni ===
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const client = new textToSpeech.TextToSpeechClient();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// === Impostazioni voce Google TTS ===
let lingua = "it-IT";
let voce = "it-IT-Standard-B"; // voce femminile naturale
let velocita = 1.0;

// === Comandi Telegram ===
bot.onText(/^\/voce (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const scelta = match[1].trim().toUpperCase();
  const vociDisponibili = {
    A: "it-IT-Standard-A",
    B: "it-IT-Standard-B",
    C: "it-IT-Standard-C",
    D: "it-IT-Standard-D",
  };

  if (vociDisponibili[scelta]) {
    voce = vociDisponibili[scelta];
    bot.sendMessage(chatId, `✅ Voce cambiata in ${voce}`);
  } else {
    bot.sendMessage(chatId, `❌ Voce non valida. Scegli tra A, B, C, D.`);
  }
});

bot.onText(/^\/lingua (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const lang = match[1].trim().toLowerCase();
  const supportate = ["it-IT", "en-US", "es-ES", "ru-RU"];

  if (supportate.includes(lang)) {
    lingua = lang;
    bot.sendMessage(chatId, `🌐 Lingua impostata su ${lang}`);
  } else {
    bot.sendMessage(chatId, `❌ Lingua non valida. Usa: it-IT, en-US, es-ES, ru-RU`);
  }
});

bot.onText(/^\/stato/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `🧭 Stato corrente:\nLingua: ${lingua}\nVoce: ${voce}\nVelocità: ${velocita}`
  );
});

bot.onText(/^\/aiuto/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `Comandi disponibili:\n/voce A|B|C|D\n/lingua it-IT|en-US|es-ES|ru-RU\n/stato\n`
  );
});

// === Gestione messaggi testuali e vocali ===
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Risponde solo se menzionata o attivata da comando vocale
    const isMentioned =
      msg.entities?.some((e) => e.type === "mention" && msg.text?.includes("@IRIS_I_K_BOT")) ||
      (text && text.toLowerCase().startsWith("iris ascolta"));

    if (!isMentioned) return;

    // Estrai testo dopo la menzione o trigger
    const cleanText = text.replace(/@IRIS_I_K_BOT/gi, "").replace(/iris ascolta/gi, "").trim();
    if (!cleanText) return;

    bot.sendChatAction(chatId, "typing");

    // === OpenAI risposta ===
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: cleanText }],
    });

    const reply = response.choices[0].message.content;
    console.log(`💬 Richiesta: ${cleanText}\n🔊 Risposta: ${reply}`);

    // === Google Cloud TTS ===
    const request = {
      input: { text: reply },
      voice: { languageCode: lingua, name: voce },
      audioConfig: { audioEncoding: "OGG_OPUS", speakingRate: velocita },
    };

    const [ttsResponse] = await client.synthesizeSpeech(request);

    const writeFile = util.promisify(fs.writeFile);
    const audioFile = `output_${Date.now()}.ogg`;
    await writeFile(audioFile, ttsResponse.audioContent, "binary");

    await bot.sendVoice(chatId, fs.createReadStream(audioFile));
    fs.unlinkSync(audioFile);
  } catch (err) {
    console.error("❌ Errore nel processo:", err);
    bot.sendMessage(msg.chat.id, "Errore durante l'elaborazione della risposta.");
  }
});

// === Server Express per Render ===
const PORT = process.env.PORT || 10000;
app.get("/", (req, res) => res.send("IRIS è attiva e connessa 🔮"));
app.listen(PORT, () => console.log(`🚀 Server avviato sulla porta ${PORT}`));
