// adapters/tts.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import TelegramBot from "node-telegram-bot-api";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = TELEGRAM_TOKEN ? new TelegramBot(TELEGRAM_TOKEN) : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "../temp");

export async function synthVoice(chatId, textInput) {
  try {
    if (!textInput) return null;
    const text = typeof textInput === "string" ? textInput : JSON.stringify(textInput);
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    const fileName = `voice_${Date.now()}.ogg`;
    const outputPath = path.join(TEMP_DIR, fileName);

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "bella", // nuova voce italiana calda
      format: "ogg",
      input: text.replace(/[❤️✨💖🤍]/g, "")
    }).catch(async (err) => {
      console.warn("⚠️ Voce 'bella' non disponibile, uso fallback alloy:", err.message);
      return await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        format: "ogg",
        input: text.replace(/[❤️✨💖🤍]/g, "")
      });
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    if (bot && chatId) await bot.sendVoice(chatId, fs.createReadStream(outputPath));
    return outputPath;
  } catch (err) {
    console.error("❌ Errore TTS:", err);
    return null;
  }
}
