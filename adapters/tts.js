// adapters/tts.js
// =====================================================
// IRIS 4.9.2 — TTS stabile
// - niente voce "bella" (non supportata)
// - voce predefinita: "coral"
// - fallback: "verse"
// - invio vocale a Telegram
// =====================================================

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
    if (!textInput) {
      console.warn("⚠️ synthVoice: testo vuoto, salto.");
      return null;
    }

    const text =
      typeof textInput === "string"
        ? textInput
        : JSON.stringify(textInput, null, 2);

    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const fileName = `voice_${Date.now()}.ogg`;
    const outputPath = path.join(TEMP_DIR, fileName);

    // tentativo con coral
    let response;
    try {
      response = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "coral",
        format: "ogg",
        input: text.replace(/[❤️✨💖🤍]/g, ""),
      });
    } catch (err) {
      console.warn(
        "⚠️ Voce 'coral' non disponibile, passo a 'verse':",
        err.message
      );
      response = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "verse",
        format: "ogg",
        input: text.replace(/[❤️✨💖🤍]/g, ""),
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    if (bot && chatId) {
      await bot.sendVoice(chatId, fs.createReadStream(outputPath), {
        caption: "🎧 Voce di IRIS",
      });
    } else {
      console.log("⚠️ Bot o chatId non disponibili, voce non inviata.");
    }

    console.log(`🔊 Voce generata e inviata (${chatId}) — coral/verse`);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore TTS:", err);
    return null;
  }
}
