// adapters/stt.js
// ---------------------------------------------------------
// IRIS — Speech-to-Text (Whisper Fix Telegram OGA → OGG)
// ---------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Scarica file Telegram e rinomina .oga → .ogg
async function downloadToOgg(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Errore download audio Telegram");

  // Temporary file
  const tempPath = `/tmp/iris-${Date.now()}.ogg`;

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(tempPath, Buffer.from(buffer));

  return tempPath;
}

// Trascrizione Whisper
async function transcribeVoice(fileUrl) {
  try {
    const oggPath = await downloadToOgg(fileUrl);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(oggPath),
      model: "whisper-1",
      language: "it", // IRIS auto-detects but Italian is best default
    });

    return transcription.text;
  } catch (err) {
    console.error("❌ Errore vocale (STT):", err);
    throw err;
  }
}

export { transcribeVoice };
