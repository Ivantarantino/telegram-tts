// ===========================================
// TTS — Sintesi Vocale Alloy Calda (4.7)
// Modello "tts-1" da Rapporto_2, path temp/
// ===========================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TEMP_DIR = path.join(process.cwd(), "temp");

export async function synthVoice(text, filename = "voice.ogg") {
  try {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    const outputFile = path.join(TEMP_DIR, filename);
    const response = await openai.audio.speech.create({
      model: "tts-1",  // Stabile, evita 404
      voice: "alloy",
      input: text.replace(/[❤️✨💖🤍]/g, ""),  // Pulisci emoji per audio
      format: "ogg"
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputFile, buffer);
    console.log(`🔊 Voce generata: ${outputFile}`);
    return outputFile;
  } catch (err) {
    console.error("Errore TTS:", err);
    return null;
  }
}
