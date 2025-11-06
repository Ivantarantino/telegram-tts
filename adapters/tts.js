// adapters/tts.js
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { getVoiceEngine } from "../core/iris_state.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// cartella temp per i .ogg
const TEMP_DIR = path.resolve("temp");

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Genera un audio TTS con la voce scelta nello stato
 * e lo invia al chatId passato.
 *
 * @param {TelegramBot} bot
 * @param {number|string} chatId
 * @param {string} text
 */
export async function sendVoice(bot, chatId, text) {
  const voiceEngine = getVoiceEngine() || "alloy";

  try {
    // nome file temporaneo
    const fileName = `iris_voice_${Date.now()}.ogg`;
    const filePath = path.join(TEMP_DIR, fileName);

    // chiamata TTS OpenAI
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts", // quello che stavi usando in 4.9.2
      voice: voiceEngine,
      format: "opus",
      input: text,
    });

    // salva su file
    const buffer = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // invia a telegram
    await bot.sendVoice(chatId, fs.createReadStream(filePath));

    console.log(
      `🔊 Voce generata e inviata (${chatId}) — openai:${voiceEngine}`
    );

    // opzionale: pulizia
    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        // niente panico
      }
    }, 15_000);
  } catch (err) {
    console.error("❌ Errore TTS:", err?.message || err);
  }
}
