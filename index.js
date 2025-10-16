import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fetch from "node-fetch";
import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";
import util from "util";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// === CLIENT OPENAI & GOOGLE ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ttsClient = new textToSpeech.TextToSpeechClient();

// === CONFIG DINAMICHE ===
let currentVoice = "it-IT-Wavenet-B";   // Voce femminile calda
let currentModel = "gpt-4o-mini";       // Miglior rapporto qualità/prezzo
let currentLanguage = "it-IT";          // Default: italiano
const BOT_USERNAME = "iris";            // Nome del tuo bot senza '@'

// === AVVIO ===
(async () => {
  if (!process.env.TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_TOKEN mancante!");
    process.exit(1);
  }

  // Elimina vecchi webhook
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/deleteWebhook`);
  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
  console.log("🤖 Bot Telegram IRIS avviato con polling.");

  // === /voce ===
  bot.onText(/^\/voce (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const voce = match[1].trim().toUpperCase();
    const valid = ["A", "B", "C", "D"];
    if (!valid.includes(voce)) return bot.sendMessage(chatId, "⚙️ Usa /voce A | B | C | D");
    currentVoice = `${currentLanguage}-Wavenet-${voce}`;
    bot.sendMessage(chatId, `✅ Voce impostata su *${currentVoice}*`, { parse_mode: "Markdown" });
  });

  // === /modello ===
  bot.onText(/^\/modello (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const model = match[1].trim();
    const validModels = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"];
    if (!validModels.includes(model)) return bot.sendMessage(chatId, "⚙️ Usa: gpt-4o-mini | gpt-4o | gpt-4-turbo");
    currentModel = model;
    bot.sendMessage(chatId, `🧠 Modello impostato su *${currentModel}*`, { parse_mode: "Markdown" });
  });

  // === /lingua ===
  bot.onText(/^\/lingua (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const lang = match[1].trim().toLowerCase();
    const map = { it: "it-IT", en: "en-US", es: "es-ES", ru: "ru-RU" };
    if (!map[lang]) return bot.sendMessage(chatId, "🌍 Usa /lingua it | en | es | ru");
    currentLanguage = map[lang];
    currentVoice = `${currentLanguage}-Wavenet-B`;
    bot.sendMessage(chatId, `🌐 Lingua impostata su *${currentLanguage}*`, { parse_mode: "Markdown" });
  });

  // === /stato ===
  bot.onText(/^\/stato/, async (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `📊 *STATO*\n\n🗣️ Voce: ${currentVoice}\n🌐 Lingua: ${currentLanguage}\n🧠 Modello: ${currentModel}`,
      { parse_mode: "Markdown" }
    );
  });

  // === /help ===
  bot.onText(/^\/help/, async (msg) => {
    bot.sendMessage(msg.chat.id, `
🧭 *Comandi disponibili*:
/voce A|B|C|D – cambia voce Google
/modello gpt-4o-mini|gpt-4o|gpt-4-turbo – cambia modello OpenAI
/lingua it|en|es|ru – cambia lingua
/stato – mostra impostazioni
/help – mostra questo messaggio
    `, { parse_mode: "Markdown" });
  });

  // === GESTIONE TESTO ===
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // ignora comandi e messaggi senza testo
    if (!text || text.startsWith("/")) return;

    // in gruppi → risponde solo se menzionata
    if (msg.chat.type.endsWith("group") && !text.toLowerCase().includes(`@${BOT_USERNAME.toLowerCase()}`)) return;

    try {
      console.log(`💬 Messaggio: ${text}`);

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [{ role: "user", content: text }],
        }),
      });
      const data = await aiResponse.json();
      const answer = data.choices?.[0]?.message?.content || "Non ho capito.";

      const [ttsResponse] = await ttsClient.synthesizeSpeech({
        input: { text: answer },
        voice: { languageCode: currentLanguage, name: currentVoice },
        audioConfig: { audioEncoding: "MP3" },
      });

      const writeFile = util.promisify(fs.writeFile);
      await writeFile("output.mp3", ttsResponse.audioContent, "binary");
      await bot.sendVoice(chatId, fs.createReadStream("output.mp3"), {}, { filename: "iris.mp3" });
      console.log(`🎧 Risposta vocale inviata (${currentVoice}, ${currentModel}, ${currentLanguage})`);
    } catch (err) {
      console.error("❌ Errore:", err.message);
      await bot.sendMessage(chatId, "⚠️ Errore durante la generazione della risposta.");
    }
  });

  // === GESTIONE VOCALI ===
  bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const caption = msg.caption || "";

    // in gruppi → risponde solo se menzionata nel caption
    if (msg.chat.type.endsWith("group") && !caption.toLowerCase().includes(`@${BOT_USERNAME.toLowerCase()}`)) return;

    try {
      const fileUrl = await bot.getFileLink(msg.voice.file_id);
      const oggRes = await fetch(fileUrl);
      const oggBuf = Buffer.from(await oggRes.arrayBuffer());
      const tmpPath = "/tmp/input.ogg";
      fs.writeFileSync(tmpPath, oggBuf);

      const tr = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tmpPath),
        model: "whisper-1",
        language: currentLanguage.split("-")[0],
      });

      const userText = (tr.text || "").trim();
      if (!userText) {
        await bot.sendMessage(chatId, "⚠️ Non ho capito il vocale, puoi ripetere?");
        return;
      }

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [{ role: "user", content: userText }],
        }),
      });
      const data = await aiResponse.json();
      const answer = data.choices?.[0]?.message?.content || "Non ho capito.";

      const [ttsResponse] = await ttsClient.synthesizeSpeech({
        input: { text: answer },
        voice: { languageCode: currentLanguage, name: currentVoice },
        audioConfig: { audioEncoding: "MP3" },
      });

      const writeFile = util.promisify(fs.writeFile);
      await writeFile("output.mp3", ttsResponse.audioContent, "binary");
      await bot.sendVoice(chatId, fs.createReadStream("output.mp3"), {}, { filename: "iris.mp3" });
      console.log(`🎤 Vocale → testo → voce (${currentLanguage})`);
    } catch (err) {
      console.error("❌ Errore vocale:", err.message);
      await bot.sendMessage(chatId, "⚠️ Errore durante l'elaborazione del vocale.");
    }
  });

  // === ENDPOINT TEST ===
  app.get("/", (req, res) => res.send("🤖 IRIS attiva e in ascolto ✅"));
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server su porta ${PORT}`));
})();
