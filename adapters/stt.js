// adapters/stt.js – STT con Whisper
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processVoice(filePath) {
  try {
    if (!fs.existsSync(filePath)) throw new Error("File non trovato.");

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: "it",
    });

    console.log(`🎙️ Trascrizione: ${transcription.text}`);
    return transcription.text.trim();
  } catch (err) {
    console.error("❌ STT error:", err.message);
    return "Non ho capito il vocale... riprova.";
  }
}
