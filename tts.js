import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Genera un file vocale MP3 con il testo specificato.
 * @param {string} text - Testo da sintetizzare.
 * @param {string} outputPath - Percorso del file da creare (es. ./temp/voce.mp3).
 */
export async function synthToFile(text, outputPath) {
  try {
    if (!text || text.trim() === "") throw new Error("Testo vuoto nella sintesi vocale.");

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      format: "mp3",
    });

    // ✅ Scrive il file binario correttamente e chiude il flusso
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log(`🔊 File vocale MP3 creato: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore nella sintesi vocale:", err.message);
    throw err;
  }
}