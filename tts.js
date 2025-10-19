// === tts.js ===
// Generatore vocale di IRIS 🎧
// Usa il modello Bark o Google TTS (configurabile)

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function generateTTS(text, voice = "female") {
  try {
    if (!text || text.trim().length === 0) throw new Error("Testo vuoto");

    const filename = `iris_voice_${Date.now()}.ogg`;
    const filepath = path.join(__dirname, "temp", filename);

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice === "male" ? "alloy" : "verse",
      input: text,
      format: "ogg",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    console.log(`🎧 File vocale generato: ${filepath}`);
    return filepath;
  } catch (err) {
    console.error("❌ Errore TTS:", err);
    return null;
  }
}
