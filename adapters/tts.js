// =====================================================
// IRIS — Adapters / TTS (Step 4.2)
// =====================================================
//
// Genera la voce calda di IRIS ("Iris Bella") come file .ogg
// Utilizza OpenAI Audio API e salva in ./temp/iris_voice.ogg
//
// =====================================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const TEMP_DIR = path.resolve("temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

export async function synthVoice(text, filename = "iris_voice.ogg") {
  try {
    if (!text || text.trim().length === 0) return null;

    const outputPath = path.join(TEMP_DIR, filename);

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy", // alternativa: "verse", "soft", "serene"
      format: "opus", // Telegram usa Opus OGG
      input: text
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    console.log(`🔊 Voce generata: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("Errore nella generazione vocale:", err);
    return null;
  }
}
