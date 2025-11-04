// core/iris_whisper.js
// ------------------------------------------------------
// IRIS Whisper Core — trascrizione vocale via OpenAI
// ------------------------------------------------------

import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------------------------------
// Funzione principale di trascrizione audio
// ------------------------------------------------------
export async function transcribeAudio(fileUrl) {
  try {
    // 1️⃣ Scarica il file vocale da Telegram
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const tempPath = path.join(__dirname, `../temp/whisper_${Date.now()}.ogg`);
    fs.writeFileSync(tempPath, response.data);

    // 2️⃣ Trascrive con Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "gpt-4o-mini-transcribe",
      response_format: "text",
      temperature: 0,
    });

    // 3️⃣ Cancella il file temporaneo
    fs.unlinkSync(tempPath);

    console.log("🗣️ Trascrizione completata:", transcription);
    return transcription.trim();
  } catch (err) {
    console.error("❌ Errore nella trascrizione Whisper:", err.message);
    return null;
  }
}
