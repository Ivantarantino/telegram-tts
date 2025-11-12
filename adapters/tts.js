// adapters/tts.js
// ---------------------------------------------------------
// IRIS — Text-to-Speech (TTS) Engine
// Basato sulle versioni funzionanti della serie 5.x
// Produce un file OGG/Opus compatibile con Telegram
// ---------------------------------------------------------

import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------
// OPENAI CLIENT
// ---------------------------------------------------------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY,
});

// ---------------------------------------------------------
// GENERA FILE VOCALE (OGG/OPUS)
// ---------------------------------------------------------
export async function generateVoice(text = "") {
  if (!text.trim()) return null;

  try {
    const response = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      format: "opus",
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    const filePath = path.join(
      __dirname,
      `../tmp/voice_${Date.now()}.ogg`
    );

    await fs.writeFile(filePath, buffer);

    return filePath;
  } catch (err) {
    console.error("❌ ERRORE TTS:", err);
    return null;
  }
}
