// tts.js — IRIS 3.0i — Generazione vocale OGG per Telegram
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Genera file vocale .ogg e restituisce il percorso locale
export async function generateVoice(text, voice = "alloy") {
  try {
    const dir = path.resolve(__dirname, "temp");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const outputFile = path.resolve(dir, `iris_voice_${Date.now()}.ogg`);

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text,
      format: "ogg"
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputFile, buffer);

    console.log(`🎧 File vocale generato: ${outputFile}`);
    return outputFile;
  } catch (error) {
    console.error("❌ Errore in generateVoice:", error);
    return null;
  }
}
