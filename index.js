import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import FormData from "form-data";
import fetch from "node-fetch";

import { synthToFile } from "./tts.js";
import { ragSearch } from "./ragSearch.js";
import { getEssence } from "./essence.js";
import configManager from "./configManager.js";
import { processMemory } from "./memoryManager.js";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OPENAI_API_KEY || !PUBLIC_BASE_URL) {
  console.error("❌ Manca una variabile d'ambiente obbligatoria (TELEGRAM_TOKEN | OPENAI_API_KEY | PUBLIC_BASE_URL).");
  process.exit(1);
}

const TEMP_DIR = path.join(__dirname, "temp");
const DATA_DIR = path.join(__dirname, "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");

fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

let state = configManager.loadConfig() || {
  lang: "it",
  model: "gpt-4o-mini",
  mode: "hy",
  voice: { model: "openai", tone: "neutro" },
  weights: { sim: 0.5, imp: 0.3, rec: 0.2 },
  essence: null,
};

function persistConfig(update = {}) {
  state = { ...state, ...update };
  configManager.saveConfig(state);
}

const app = express();
app.use(express.json());

const packageJson = JSON.parse(readFileSync(
  new URL("node_modules/node-telegram-bot-api/package.json", import.meta.url)
));
console.log(`📦 node-telegram-bot-api version: ${packageJson.version}`);

const bot = new TelegramBot(BOT_TOKEN, { polling: false, filepath: false });
const WEBHOOK_PATH = `/bot${BOT_TOKEN}`;

app.post(WEBHOOK_PATH, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

(async () => {
  try {
    await bot.deleteWebHook();
    await bot.setWebHook(`${PUBLIC_BASE_URL}${WEBHOOK_PATH}`);
    console.log(`🔗 Webhook impostato su: ${PUBLIC_BASE_URL}${WEBHOOK_PATH}`);
  } catch (err) {
    console.error("❌ Errore webhook:", err);
  }
})();

app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
});

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

async function ttsToOgg(text) {
  const filename = `tts-${Date.now()}.ogg`;
  const filePath = path.join(TEMP_DIR, filename);
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
    format: "opus",
  });
  const buffer = Buffer.from(await speech.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return { filePath, buffer };
}

async function replyTextAndVoice(chatId, text) {
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  try {
    const { buffer } = await ttsToOgg(text);
    await bot.sendVoice(chatId, buffer, {}, {
      filename: `tts-${Date.now()}.ogg`,
      contentType: "audio/ogg",
    });
  } catch (err) {
    console.error("⚠️ TTS error:", err.message);
  }
}

// 🧠 Gestione vocale corretta per Render (file temporaneo .ogg)
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.voice) {
    try {
      const voiceFile = await bot.getFile(msg.voice.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${voiceFile.file_path}`;
      const response = await fetch(fileUrl);
      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // 🔹 Salvataggio temporaneo del file audio
      const tmpFile = path.join(TEMP_DIR, `voice-${Date.now()}.ogg`);
      fs.writeFileSync(tmpFile, audioBuffer);

      // 🔹 Trascrizione stabile per Node/Render
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tmpFile),
        model: "whisper-1",
        language: state.lang,
      });

      fs.unlinkSync(tmpFile);

      const text = transcription.text.trim();
      if (!text) return bot.sendMessage(chatId, "⚠️ Impossibile trascrivere il messaggio vocale.");

      const completion = await openai.chat.completions.create({
        model: state.model,
        messages: [{ role: "user", content: text }],
      });

      const answer = completion.choices[0].message.content.trim();
      await replyTextAndVoice(chatId, answer);
    } catch (err) {
      console.error("❌ Errore nella trascrizione del messaggio vocale:", err.message);
      bot.sendMessage(chatId, "⚠️ Errore nella trascrizione del messaggio vocale.");
    }
  }
});
