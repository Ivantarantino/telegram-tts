import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Percorso dove salvare i file audio generati
const tempDir = path.resolve("temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

/**
 * Genera file audio TTS e restituisce il percorso locale
 * @param {string} text - Testo da convertire in voce
 * @param {string} voice - Nome della voce (es. "alloy", "verse")
 * @returns {Promise<string>} Percorso del file audio generato
 */
export async function generateTTS(text, voice = "alloy") {
  try {
    const filename = `tts_${Date.now()}.mp3`;
    const filepath = path.join(tempDir, filename);

    console.log(`🎙 Generazione vocale in corso (${voice})...`);

    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    console.log(`✅ File vocale creato: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error("❌ Errore durante la generazione TTS:", error);
    throw error;
  }
}
