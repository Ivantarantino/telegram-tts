// src/adapters/stt.js
// IRIS – STT per Telegram (.ogg → Whisper) senza axios e senza ffmpeg
// Compatibile con Render
// Che il Daje sia con Noi 💎

import fs from "fs";
import path from "path";
import { finished } from "stream/promises";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Salva lo stream di Telegram in un file temporaneo .ogg
 * @param {object} bot - istanza telegram
 * @param {string} fileId - id del file vocale
 * @returns {Promise<string>} percorso del file .ogg salvato
 */
export async function downloadTelegramVoice(bot, fileId) {
  const tmpPath = path.resolve(`/tmp/${fileId}.ogg`);
  const stream = await bot.getFileStream(fileId);

  const writeStream = fs.createWriteStream(tmpPath);
  stream.pipe(writeStream);
  await finished(writeStream);

  return tmpPath;
}

/**
 * Trascrive il file .ogg direttamente con Whisper
 * @param {string} oggPath
 * @returns {Promise<string>}
 */
export async function transcribeWithWhisper(oggPath) {
  try {
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(oggPath),
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
 * Funzione principale: da fileId Telegram → testo
 * @param {object} bot
 * @param {string} fileId
 * @returns {Promise<string>}
 */
export async function transcribeVoiceMessage(bot, fileId) {
  let oggPath;
  try {
    // 1️⃣ scarica dal messaggio vocale
    oggPath = await downloadTelegramVoice(bot, fileId);

    // 2️⃣ manda a Whisper
    const text = await transcribeWithWhisper(oggPath);

    // 3️⃣ pulizia
    if (oggPath && fs.existsSync(oggPath)) {
      fs.unlinkSync(oggPath);
    }

    console.log(`🗣️ Voce trascritta: "${text}"`);
    return text;
  } catch (err) {
    console.error("❌ Errore in transcribeVoiceMessage:", err.message);

    if (oggPath && fs.existsSync(oggPath)) {
      fs.unlinkSync(oggPath);
    }

    return "";
  }
}
