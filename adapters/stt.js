// src/adapters/stt.js
// =======================================================
// IRIS — STT per Telegram (versione pulita)
// .ogg → fetch → .wav (ffmpeg-static) → Whisper
// =======================================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
ffmpeg.setFfmpegPath(ffmpegPath);

// 1) scarica vocale Telegram
export async function downloadTelegramVoice(bot, fileId) {
  const fileUrl = await bot.getFileLink(fileId);
  const tmpOggPath = path.resolve(`/tmp/${fileId}.ogg`);

  const resp = await fetch(fileUrl);
  if (!resp.ok) {
    throw new Error(`Download Telegram fallito: ${resp.status} ${resp.statusText}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(tmpOggPath, buffer);

  const stats = fs.statSync(tmpOggPath);
  console.log(`📦 Audio scaricato (fetch): ${tmpOggPath} (${stats.size} bytes)`);
  return tmpOggPath;
}

// 2) converte in wav
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
        const stats = fs.existsSync(wavPath) ? fs.statSync(wavPath) : { size: 0 };
        console.log(`🎧 Conversione completata → ${wavPath} (${stats.size} bytes)`);
        resolve(wavPath);
      })
      .on("error", (err) => {
        console.error("❌ Errore ffmpeg nella conversione OGG → WAV:", err.message);
        reject(err);
      })
      .save(wavPath);
  });
}

// 3) trascrive con Whisper
export async function transcribeWithWhisper(wavPath) {
  try {
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavPath),
      model: "whisper-1",
      language: "it",
      response_format: "json",
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

// 4) orchestratore
export async function transcribeVoiceMessage(bot, fileId) {
  let oggPath;
  let wavPath;
  try {
    oggPath = await downloadTelegramVoice(bot, fileId);
    wavPath = await convertOggToWav(oggPath);
    const text = await transcribeWithWhisper(wavPath);

    if (oggPath && fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    if (wavPath && fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

    return text || "";
  } catch (err) {
    console.error("❌ Errore STT generale:", err.message);
    if (oggPath && fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    if (wavPath && fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
    return "";
  }
}
