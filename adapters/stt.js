// adapters/stt.js
// ---------------------------------------------------------
// IRIS — Speech To Text (Telegram vocali → testo)
// ---------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------------------------------------------------------
// Scarica il file audio da URL in un file temporaneo
// ---------------------------------------------------------
async function downloadToTempFile(fileUrl) {
  if (typeof fileUrl !== "string") {
    throw new TypeError(`downloadToTempFile: URL non valido: ${String(fileUrl)}`);
  }

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} durante il download audio`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tmpDir = "/tmp";
  const filename = `iris-voice-${Date.now()}.oga`;
  const filePath = path.join(tmpDir, filename);

  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

// ---------------------------------------------------------
// Transcribe: URL → testo
// ---------------------------------------------------------
export async function transcribeVoice(fileUrl) {
  try {
    const localPath = await downloadToTempFile(fileUrl);

    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(localPath),
      // modello STT: adegua al naming che stai usando nelle altre parti del progetto
      model: "gpt-4o-mini-transcribe",
    });

    // pulizia base
    const textRaw =
      typeof transcription.text === "string"
        ? transcription.text
        : "";

    const text = textRaw.trim();

    // opzionale: elimina file temporaneo
    try {
      await fs.promises.unlink(localPath);
    } catch (err) {
      console.warn("Impossibile cancellare file temporaneo STT:", err.message);
    }

    return text;
  } catch (err) {
    console.warn("❌ Errore vocale (STT):", err);
    return "";
  }
}
