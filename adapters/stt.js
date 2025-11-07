// src/adapters/stt.js
// =======================================================
// IRIS — Sovranità Integrale
// STT definitivo: fetch Telegram .ogg → .wav → Whisper
// Basato su pipeline CHAT4.md + compatibilità Render
// =======================================================
// Che il Daje sia con Noi 💎

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * 🔹 Scarica il vocale Telegram via fetch (completo)
 */
export async function downloadTelegramVoice(bot, fileId) {
  try {
    const fileUrl = await bot.getFileLink(fileId);
    const tmpOggPath = path.resolve(`/tmp/${fileId}.ogg`);

    const resp = await fetch(fileUrl);
    if (!resp.ok) throw new Error(`Download fallito: ${resp.statusText}`);

    const arrayBuffer = await resp.arrayBuffer();
    fs.writeFileSync(tmpOggPath, Buffer.from(arrayBuffer));

    const stats = fs.statSync(tmpOggPath);
    console.log(`📦 Audio scaricato (fetch): ${tmpOggPath} (${stats.size} bytes)`);
    return tmpOggPath;
  } catch (err) {
    console.error("❌ Errore durante il download Telegram:", err.message);
    throw err;
  }
}

/**
 * 🔹 Converte .ogg (Opus) → .wav (16kHz mono)
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
    console.error("❌ Errore Whisper:", err.message);
    throw err;
  }
}

/**
 * 🔹 Funzione principale — da file Telegram → testo
 */
export async function transcribeVoiceMessage(bot, fileId) {
  let oggPath, wavPath;
  try {
    oggPath = await downloadTelegramVoice(bot, fileId);
    wavPath = await convertOggToWav(oggPath);
    const text = await transcribeWithWhisper(wavPath);

    if (oggPath && fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    if (wavPath && fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

    return text || "";
  } catch (err) {
    console.error("❌ Errore STT:", err.message);
    if (oggPath && fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    if (wavPath && fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
    return "";
  }
}
