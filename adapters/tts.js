// adapters/tts.js
// =====================================================
// IRIS 5.0.0 — TTS che legge dallo stato
// =====================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import TelegramBot from "node-telegram-bot-api";
import { getVoiceConfig } from "../core/iris_state.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = TELEGRAM_TOKEN ? new TelegramBot(TELEGRAM_TOKEN) : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "../temp");

export async function synthVoice(chatId, textInput) {
  try {
    if (!textInput) return null;

    const voiceCfg = getVoiceConfig(); // { engine, name, pitch, speed }
    const engine = voiceCfg.engine || "openai";
    const voiceName = voiceCfg.name || "coral";

    const text =
      typeof textInput === "string" ? textInput : JSON.stringify(textInput, null, 2);

    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    const fileName = `voice_${Date.now()}.ogg`;
    const outputPath = path.join(TEMP_DIR, fileName);

    if (engine === "openai") {
      // proviamo la voce richiesta, se fallisce andiamo su verse
      let response;
      try {
        response = await openai.audio.speech.create({
          model: "gpt-4o-mini-tts",
          voice: voiceName,
          format: "ogg",
          input: text.replace(/[❤️✨💖🤍]/g, ""),
        });
      } catch (err) {
        console.warn(
          `⚠️ Voce '${voiceName}' non disponibile, uso fallback 'verse':`,
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
      }
      console.log(`🔊 Voce generata e inviata (${chatId}) — openai:${voiceName}`);
      return outputPath;
    }

    // altri motori non ancora attivi
    console.log(`⚠️ Motore voce ${engine} non ancora implementato in questa build.`);
    return null;
  } catch (err) {
    console.error("❌ Errore TTS:", err);
    return null;
  }
}
