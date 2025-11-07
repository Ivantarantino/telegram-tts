// src/adapters/stt.js
// =======================================================
// IRIS — STT definitivo per Telegram
// .ogg (Telegram) → download completo via fetch → .wav via ffmpeg-static → Whisper
// con logging esteso della risposta di Whisper
// =======================================================
// Che il Daje sia con Noi 💎

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// diciamo a fluent-ffmpeg dove sta il binario statico
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * 1) Scarica il vocale di Telegram usando il link pubblico
 *    (fetch di Node 22) e lo salva in /tmp come .ogg
 */
export async function downloadTelegramVoice(bot, fileId) {
  const fileUrl = await bot.getFileLink(fileId);
  const tmpOggPath = path.resolve(`/tmp/${fileId}.ogg`);

  const resp = await fetch(fileUrl);
  if (!resp.ok) {
    throw new Error(`Download Telegram fallito: ${resp.status} ${resp.statusText}`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(tmpOggPath, buffer);

  const stats = fs.statSync(tmpOggPath);
  console.log(`📦 Audio scaricato (fetch): ${tmpOggPath} (${stats.size} bytes)`);

  return tmpOggPath;
}

/**
 * 2) Converte .ogg (Opus) → .wav (16k mono) usando ffmpeg-static
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

/**
 * 3) Trascrive con Whisper e LOGGA la risposta completa
 */
export async function transcribeWithWhisper(wavPath) {
  try {
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavPath),
      model: "whisper-1",
      language: "it",         // forziamo italiano per i vocali brevi
      response_format: "json",
      temperature: 0,
    });

    // logghiamo tutto per capire perché a volte è vuoto
    console.log("🔍 Whisper raw response:", resp);

    const text = (resp?.text || "").trim();
    console.log(`🗣️ Trascrizione Whisper: "${text}"`);
    return text;
  } catch (err) {
    console.error("❌ Errore nella trascrizione Whisper:", err.message);
    throw err;
  }
}

/**
 * 4) Funzione principale: da file Telegram → testo
 */
export async function transcribeVoiceMessage(bot, fileId) {
  let oggPath;
  let wavPath;
  try {
    // scarica da Telegram
    oggPath = await downloadTelegramVoice(bot, fileId);

    // converte in WAV
    wavPath = await convertOggToWav(oggPath);

    // trascrive
    const text = await transcribeWithWhisper(wavPath);

    // pulizia
    if (oggPath && fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    if (wavPath && fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

    // ritorna testo (anche vuoto, così il bot può rispondere “non ho compreso”)
    return text || "";
  } catch (err) {
    console.error("❌ Errore STT generale:", err.message);

    if (oggPath && fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    if (wavPath && fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

    return "";
  }
}
