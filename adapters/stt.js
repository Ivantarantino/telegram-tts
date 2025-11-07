// adapters/stt.js
// ---------------------------------------------------------
// IRIS — STT Adapter (Speech to Text)
// Trascrive i vocali Telegram in testo con OpenAI Whisper
// ---------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// directory temporanea
const TMP_DIR = "/tmp";
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Scarica il file vocale da Telegram, converte in WAV e lo trascrive.
 * @param {TelegramBot} botInstance - istanza del bot Telegram
 * @param {string} fileId - file_id Telegram del vocale
 * @returns {Promise<string>} - testo trascritto
 */
export async function transcribeVoice(botInstance, fileId) {
  try {
    // Ottieni URL file da Telegram
    const fileLink = await botInstance.getFileLink(fileId);

    // Scarica il file .ogg originale
    const oggPath = path.join(TMP_DIR, `voice_${Date.now()}.ogg`);
    const res = await fetch(fileLink);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(oggPath, Buffer.from(buffer));

    // Converte in .wav per Whisper
    const wavPath = oggPath.replace(".ogg", ".wav");
    await new Promise((resolve, reject) => {
      ffmpeg(oggPath)
        .toFormat("wav")
        .on("error", reject)
        .on("end", resolve)
        .save(wavPath);
    });

    // Trascrive con Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavPath),
      model: "gpt-4o-mini-transcribe", // modello leggero e veloce
      language: "it"
    });

    const text = transcription.text?.trim() || "";
    console.log(`🗣️ Trascrizione Whisper: "${text}"`);
    return text || "Non ho capito bene il vocale 🌸";
  } catch (err) {
    console.error("❌ Errore in transcribeVoice:", err.message);
    return "Non ho compreso bene il vocale 🌸";
  }
}
