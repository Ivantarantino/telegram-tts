// adapters/stt.js – STT con OpenAI Whisper, export 'processVoice'
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Processa un file vocale e lo trascrive con Whisper.
 * @param {string} filePath - Percorso del file vocale (ogg/mp3).
 * @returns {string} Trascrizione testo.
 */
export async function processVoice(filePath) {
  try {
    if (!fs.existsSync(filePath)) throw new Error("File vocale non trovato.");

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: "it",  // Default italiano; cambia via state
    });

    console.log(`🎙️ Trascrizione: ${transcription.text}`);
    return transcription.text.trim();
  } catch (err) {
    console.error("❌ STT error:", err.message);
    return "Non ho capito il vocale... riprova.";
  }
}

// Alias per compatibilità con scaffold
export { processVoice as transcribeVoice, processVoice as whisperTranscribe };
