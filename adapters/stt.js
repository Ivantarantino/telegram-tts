// src/adapters/stt.js
// =======================================================
// IRIS — Sovranità Integrale
// STT (Speech-to-Text) per Telegram .ogg → .wav → Whisper
// Versione: 5.x · Compatibile con Render
// Basata sulla pipeline funzionante di CHAT4.md
// =======================================================
// Che il Daje sia con Noi 💎

import fs from "fs";
import path from "path";
import { finished } from "stream/promises";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * 🔹 Scarica il vocale Telegram e lo salva in /tmp
 */
export async function downloadTelegramVoice(bot, fileId) {
  const tmpOggPath = path.resolve(`/tmp/${fileId}.ogg`);
  const stream = await bot.getFileStream(fileId);
  const writeStream = fs.createWriteStream(tmpOggPath);
  stream.pipe(writeStream);
  await finished(writeStream);
  const stats = fs.statSync(tmpOggPath);
  console.log(`📦 Audio scaricato da Telegram: ${tmpOggPath} (${stats.size} bytes)`);
  return tmpOggPath;
}

/**
 * 🔹 Converte .ogg (Opus) → .wav (16kHz mono)
 */
export async function convertOggToWav(oggPath) {
  return new Promise((resolve, reject) => {
    const wavPath = oggPath.replace(".ogg", ".wav");

    ffmpeg(oggPath)
      .setFfmpegPath(ffmpegPath)
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .audioChannels(1)
      .format("wav")
      .on("end", () => {
        const stats = fs.statSync(wavPath);
        console.log(`🎧 Conversione completata → ${wavPath} (${stats.size} bytes)`);
        resolve(wavPath);
      })
      .on("error", (err) => {
        console.error("❌ Errore ffmpeg:", err.message);
        reject(err);
      })
      .save(wavPath);
  });
}

/**
 * 🔹 Trascrive con Whisper (OpenAI)
 */
export async function transcribeWithWhisper(wavPath) {
  try {
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavPath),
      model: "whisper-1",
      language: "it",
      response_format: "text",
      temperature: 0,
    });
    const text = (resp?.text || "").trim();
    console.log(`🗣️ Trascrizione Whisper: "${text}"`);
    return text;
  } catch (err) {
    console.error("❌ Errore nella trascrizione Whisper:", err.message);
    throw err;
  }
}

/**
 * 🔹 Funzione principale — da file Telegram → testo
 */
export async function transcribeVoiceMessage(bot, fileId) {
  let oggPath, wavPath;
  try {
    // 1️⃣ Scarica da Telegram
    oggPath = await downloadTelegramVoice(bot, fileId);

    // 2️⃣ Converte in WAV
    wavPath = await convertOggToWav(oggPath);

    // 3️⃣ Trascrive con Whisper
    const text = await transcribeWithWhisper(wavPath);

    // 4️⃣ Pulizia file temporanei
    if (oggPath && fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    if (wavPath && fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

    // 5️⃣ Restituisce testo o fallback
    if (text && text.length > 0) return text;
    else return "";
  } catch (err) {
    console.error("❌ Errore generale STT:", err.message);
    if (oggPath && fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    if (wavPath && fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
    return "";
  }
}
