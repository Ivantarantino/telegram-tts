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

// === Config dinamiche ===
let currentVoice = "it-IT-Wavenet-B";   // Femminile italiana
let currentModel = "gpt-4o-mini";       // Miglior rapporto qualità/prezzo
let currentLanguage = "it-IT";          // Default: italiano

// === Avvio principale ===
(async () => {
  if (!process.env.TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_TOKEN mancante!");
    process.exit(1);
  }

  // Disattiva eventuali webhook
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/deleteWebhook`);

  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
  console.log("🤖 Bot Telegram attivo.");

  // === /voce ===
  bot.onText(/^\/voce (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const voce = match[1].trim().toUpperCase();
    const valid = ["A", "B", "C", "D"];
    if (!valid.includes(voce)) return bot.sendMessage(chatId, "⚙️ /voce A, B, C o D");
    currentVoice = `${currentLanguage}-Wavenet-${voce}`;
    bot.sendMessage(chatId, `✅ Voce impostata su *${currentVoice}*`, { parse_mode: "Markdown" });
  });

  // === /modello ===
  bot.onText(/^\/modello (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const model = match[1].trim();
    const validModels = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"];
    if (!validModels.includes(model)) return bot.sendMessage(chatId, "⚙️ Modello non valido. Usa: gpt-4o-mini | gpt-4o | gpt-4-turbo");
    currentModel = model;
    bot.sendMessage(chatId, `🧠 Modello impostato su *${currentModel}*`, { parse_mode: "Markdown" });
  });

  // === /lingua ===
  bot.onText(/^\/lingua (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const lang = match[1].trim().toLowerCase();
    const map = {
      it: "it-IT",
      en: "en-US",
      es: "es-ES",
      ru: "ru-RU"
    };
    if (!map[lang]) return bot.sendMessage(chatId, "🌍 Usa /lingua it | en | es | ru");
    currentLanguage = map[lang];
    currentVoice = `${currentLanguage}-Wavenet-B`; // aggiorna voce base
    bot.sendMessage(chatId, `🌐 Lingua impostata su *${currentLanguage}*`, { parse_mode: "Markdown" });
  });

  // === /stato ===
  bot.onText(/^\/stato/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      `📊 *STATO ATTUALE*\n\n🗣️ Voce: ${currentVoice}\n🌐 Lingua: ${currentLanguage}\n🧠 Modello: ${currentModel}`,
      { parse_mode: "Markdown" }
    );
  });

  // === /help ===
  bot.onText(/^\/help/, async (msg) => {
    bot.sendMessage(msg.chat.id, `
🧭 *Comandi disponibili*:
/voce A|B|C|D – cambia voce Google
/modello gpt-4o-mini|gpt-4o|gpt-4-turbo – cambia modello OpenAI
/lingua it|en|es|ru – cambia lingua TTS
/stato – mostra le impostazioni correnti
/help – mostra questo messaggio
    `, { parse_mode: "Markdown" });
  });

  // === Risposta automatica ===
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text.startsWith("/")) return;

    try {
      console.log(`💬 Messaggio: ${text}`);

      // OpenAI risposta
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

      // Google Cloud TTS
      const [ttsResponse] = await ttsClient.synthesizeSpeech({
        input: { text: answer },
        voice: { languageCode: currentLanguage, name: currentVoice },
        audioConfig: { audioEncoding: "MP3" },
      });

      const writeFile = util.promisify(fs.writeFile);
      await writeFile("output.mp3", ttsResponse.audioContent, "binary");
      await bot.sendVoice(chatId, fs.createReadStream("output.mp3"), {}, { filename: "risposta.mp3" });

      console.log(`🎧 Audio inviato (${currentVoice}, ${currentModel}, ${currentLanguage})`);
    } catch (err) {
      console.error("❌ Errore:", err.message);
      await bot.sendMessage(chatId, "⚠️ Errore durante la generazione della risposta.");
    }
  });

  // === Test Render ===
  app.get("/", (req, res) => res.send("Bot multilingua GPT-4o-mini attivo ✅"));
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server su porta ${PORT}`));
})();
