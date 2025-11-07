// src/adapters/stt.js
// IRIS – STT per Telegram con conversione .ogg → .wav usando ffmpeg-static
// Compatibile con Render
// Che il Daje sia con Noi 💎

import fs from "fs";
import path from "path";
import { finished } from "stream/promises";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// diciamo a fluent-ffmpeg dove sta il binario di ffmpeg (quello statico)
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * 1) Scarica il vocale Telegram in /tmp come .ogg
 */
export async function downloadTelegramVoice(bot, fileId) {
  const tmpOggPath = path.resolve(`/tmp/${fileId}.ogg`);
  const stream = await bot.getFileStream(fileId);
  const writeStream = fs.createWriteStream(tmpOggPath);
  stream.pipe(writeStream);
  await finished(writeStream);
  return tmpOggPath;
}

/**
 * 2) Converte .ogg (opus) → .wav 16kHz mono
 */
export async function convertOggToWav(oggPath) {
  return new Promise((resolve, reject) => {
    const wavPath = oggPath.replace(".ogg", ".wav");

    ffmpeg(oggPath)
      .inputOptions(["-vn"])
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .audioChannels(1)
      .format("wav")
      .on("end", () => {
        resolve(wavPath);
      })
      .on("error", (err) => {
        console.error("❌ Errore ffmpeg nella conversione OGG → WAV:", err.message);
        reject(err);
      })
      .save(wavPath);
  });
}

/**
 * 3) Trascrive il .wav con Whisper
 */
export async function transcribeWithWhisper(wavPath) {
  try {
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavPath),
      model: "whisper-1",
      response_format: "text",
      temperature: 0,
    });
    return (resp?.text || "").trim();
  } catch (err) {
    console.error("❌ Errore durante la trascrizione Whisper:", err.message);
    throw err;
  }
}

/**
 * 4) Funzione principale: da fileId Telegram → testo
 */
export async function transcribeVoiceMessage(bot, fileId) {
  let oggPath;
  let wavPath;
  try {
    // 1️⃣ scarica da Telegram
    oggPath = await downloadTelegramVoice(bot, fileId);

    // 2️⃣ converti in .wav
    wavPath = await convertOggToWav(oggPath);

    // 3️⃣ manda a Whisper
    const text = await transcribeWithWhisper(wavPath);

    // 4️⃣ pulizia
    if (oggPath && fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    if (wavPath && fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

    console.log(`🗣️ Voce trascritta: "${text}"`);
    return text;
  } catch (err) {
    console.error("❌ Errore in transcribeVoiceMessage:", err.message);

    if (oggPath && fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    if (wavPath && fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

    return "";
  }
}
