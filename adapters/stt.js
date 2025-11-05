// adapters/stt.js
// =====================================================
// IRIS 4.7C — Modulo STT (Speech To Text)
// Trascrizione dei messaggi vocali Telegram via Whisper
// =====================================================

import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "../temp");

// -----------------------------------------------------
// Scarica file vocale Telegram e trascrive in testo
// -----------------------------------------------------
export async function transcribeVoice(bot, fileId) {
  try {
    if (!fileId) throw new Error("Nessun fileId fornito per la trascrizione.");

    const fileUrl = await bot.getFileLink(fileId);

    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    const oggPath = path.join(TEMP_DIR, `input_${Date.now()}.ogg`);
    const res = await fetch(fileUrl);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(oggPath, Buffer.from(buffer));

    console.log(`🎙️ File vocale scaricato: ${oggPath}`);

    const audioStream = fs.createReadStream(oggPath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "gpt-4o-mini-transcribe",
      language: "it",
    });

    const text = transcription.text?.trim() || "";
    console.log(`🗣️ Trascrizione: ${text}`);

    return text;
  } catch (err) {
    console.error("❌ Errore nella trascrizione vocale:", err);
    return "";
  }
}
