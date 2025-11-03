// adapters/tts.js
// ------------------------------------------------------
// IRIS — Step 4.7.3b Fix: pulizia emoji nel parlato
// ------------------------------------------------------

import fs from "fs";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Genera file vocale da testo (TTS)
 * Rimuove emoji e simboli che il modello leggerebbe letteralmente.
 * @param {string} text
 * @param {string} filename
 * @returns {Promise<string|null>}
 */
export async function synthVoice(text, filename = "voice.ogg") {
  try {
    if (!text || typeof text !== "string") return null;

    // Rimuovi emoji, simboli, doppi spazi
    const cleanText = text
      .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: cleanText
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const path = `./temp/${filename}`;
    fs.writeFileSync(path, buffer);
    console.log(`🔊 Voce generata: ${path}`);
    return path;
  } catch (err) {
    console.error("❌ Errore nella generazione vocale:", err);
    return null;
  }
}
