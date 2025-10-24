// =========================================
// TTS – IRIS 3.8.7
// Genera voce da testo via OpenAI (GPT-4o-mini-tts)
// =========================================

import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generaVoce(testo, outputPath = "./voice.mp3") {
  try {
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: testo
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log("🎤 Voce generata:", outputPath);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore TTS:", err);
    return null;
  }
}
