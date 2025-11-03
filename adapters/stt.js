// adapters/stt.js
// ------------------------------------------------------
// IRIS — Step 4.7 Voce del Cuore (STT Whisper)
// ------------------------------------------------------

import fs from "fs";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Trascrive un file audio OGG in testo.
 * @param {string} filePath - Percorso del file audio .ogg
 * @returns {Promise<string>} - Testo trascritto
 */
export async function transcribeAudio(filePath) {
  try {
    const fileStream = fs.createReadStream(filePath);
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "gpt-4o-mini-transcribe",
      response_format: "text"
    });
    const text = transcription?.trim?.() || transcription;
    console.log(`🗣️ Trascrizione: ${text}`);
    return text;
  } catch (err) {
    console.error("❌ Errore Whisper (STT):", err);
    return "";
  }
}
