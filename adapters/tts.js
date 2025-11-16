// adapters/tts.js – TTS OpenAI con export named 'synthToFile'
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Genera un file vocale MP3.
 * @param {string} text - Testo da sintetizzare.
 * @param {string} outputPath - Percorso output.
 * @param {string} voice - Voce (default "alloy").
 * @returns {string} Path del file generato.
 */
export async function synthToFile(text, outputPath, voice = "alloy") {
  try {
    if (!text.trim()) throw new Error("Testo vuoto.");

    const response = await openai.audio.speech.create({
      model: "tts-1",  // Usa "tts-1-hd" per qualità alta
      voice,
      input: text,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log(`🔊 Audio creato: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ TTS error:", err.message);
    throw err;
  }
}
