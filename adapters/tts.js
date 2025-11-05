// adapters/tts.js
// =====================================================
// IRIS 4.7C — Modulo TTS (voce alloy calda + invio a Telegram)
// Genera .ogg e lo invia come messaggio vocale
// =====================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import TelegramBot from "node-telegram-bot-api";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "../temp");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = TELEGRAM_TOKEN ? new TelegramBot(TELEGRAM_TOKEN) : null;

// -----------------------------------------------------
// Sintesi vocale + invio file a Telegram
// -----------------------------------------------------
export async function synthVoice(chatId, textInput) {
  try {
    if (!textInput) {
      console.warn("⚠️ synthVoice: testo vuoto, nessuna voce generata.");
      return null;
    }

    const text =
      typeof textInput === "string"
        ? textInput
        : JSON.stringify(textInput, null, 2);

    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    const fileName = `voice_${Date.now()}.ogg`;
    const outputPath = path.join(TEMP_DIR, fileName);

    console.log(`🔊 Generazione voce alloy: ${outputPath}`);

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      format: "ogg",
      input: text.replace(/[❤️✨💖🤍]/g, ""),
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    console.log(`🔊 Voce alloy calda evocata: ${outputPath}`);

    // Invio vocale a Telegram se possibile
    if (bot && chatId) {
      try {
        await bot.sendVoice(chatId, fs.createReadStream(outputPath), {
          caption: "🎧 Voce di IRIS",
        });
        console.log(`📨 Voce inviata a Telegram: ${chatId}`);
      } catch (err) {
        console.error("⚠️ Errore invio vocale a Telegram:", err);
      }
    } else {
      console.log("⚠️ Bot o chatId non disponibili — voce non inviata.");
    }

    return outputPath;
  } catch (err) {
    console.error("❌ Errore TTS alloy:", err);
    return null;
  }
}
