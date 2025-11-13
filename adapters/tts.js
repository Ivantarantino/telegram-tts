// adapters/tts.js
// ---------------------------------------------------------
// TTS per IRIS (Telegram)
// - Usa OpenAI Text-to-Speech per generare voce OGG/Opus
// - Esporta: generateVoice, synthVoice, speakText
//   (tutti alias tra loro, per piena compatibilità).
// ---------------------------------------------------------

import OpenAI from "openai";
import fs from "fs";
import os from "os";
import path from "path";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API,
});

const TTS_MODEL =
  process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_VOICE || "alloy";
const TTS_FORMAT = "opus"; // OGG/Opus, perfetto per Telegram

/**
 * Genera un file vocale a partire da testo, ritorna il path locale.
 */
export async function generateVoice(text) {
  if (!text || !text.trim()) {
    throw new Error("generateVoice: testo vuoto");
  }

  const response = await client.audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: text,
    format: TTS_FORMAT,
  });

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tmpPath = path.join(
    os.tmpdir(),
    `iris-voice-${Date.now()}.ogg`
  );
  await fs.promises.writeFile(tmpPath, buffer);

  console.log("🔊 Voce generata:", tmpPath);
  return tmpPath;
}

/**
 * Alias storici per compatibilità con tutte le versioni di telegram_bot.js
 */
export async function synthVoice(text) {
  return generateVoice(text);
}

export async function speakText(text) {
  return generateVoice(text);
}

// Anche qui, un default "amichevole"
export default {
  generateVoice,
  synthVoice,
  speakText,
};
