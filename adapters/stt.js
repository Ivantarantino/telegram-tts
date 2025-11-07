// adapters/stt.js
// IRIS – Modulo Speech-to-Text per Telegram (vocali .ogg / .oga)
// Compatibile con Render e OpenAI Whisper
// Aggiornato per IRIS 5.x — Sovranità Integrale
// Che il Daje sia con Noi 💎

import fs from "fs";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import OpenAI from "openai";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Scarica il file vocale da Telegram e lo salva localmente
 * @param {object} bot - istanza di node-telegram-bot-api
 * @param {string} fileId - ID del file Telegram
 * @returns {Promise<string>} percorso locale del file scaricato (.ogg)
 */
export async function downloadTelegramVoice(bot, fileId) {
  try {
    const fileLink = await bot.getFileLink(fileId);
    const filePath = path.resolve(`/tmp/${fileId}.ogg`);
    const response = await axios({
      url: fileLink,
      method: "GET",
      responseType: "arraybuffer",
    });
    fs.writeFileSync(filePath, Buffer.from(response.data), "binary");
    return filePath;
  } catch (err) {
    console.error("❌ Errore durante il download del file vocale:", err.message);
    throw err;
  }
}

/**
 * Converte il file .ogg (opus) in .wav (16kHz mono)
 * @param {string} inputPath - percorso file .ogg originale
 * @returns {Promise<string>} percorso del file .wav convertito
 */
export async function convertOggToWav(inputPath) {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath.replace(".ogg", ".wav");
    ffmpeg(inputPath)
      .audioCodec("pcm_s16le")
      .format("wav")
      .audioFrequency(16000)
      .audioChannels(1)
      .on("end", () => resolve(outputPath))
      .on("error", (err) => {
        console.error("❌ Errore nella conversione ffmpeg:", err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Trascrive il file audio in testo tramite OpenAI Whisper
 * @param {string} wavPath - percorso del file .wav da trascrivere
 * @returns {Promise<string>} testo trascritto
 */
export async function transcribeWithWhisper(wavPath) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavPath),
      model: "whisper-1",
      response_format: "text",
      temperature: 0,
    });
    return transcription.text?.trim() || "";
  } catch (err) {
    console.error("❌ Errore durante la trascrizione Whisper:", err.message);
    throw err;
  }
}

/**
 * Funzione principale di trascrizione vocale per Telegram
 * @param {object} bot - istanza di node-telegram-bot-api
 * @param {string} fileId - ID del file Telegram
 * @returns {Promise<string>} testo trascritto
 */
export async function transcribeVoiceMessage(bot, fileId) {
  let oggPath, wavPath;
  try {
    // 1️⃣ Scarica il file vocale
    oggPath = await downloadTelegramVoice(bot, fileId);

    // 2️⃣ Converte da OGG (Opus) a WAV (compatibile Whisper)
    wavPath = await convertOggToWav(oggPath);

    // 3️⃣ Trascrizione con Whisper
    const text = await transcribeWithWhisper(wavPath);

    // 4️⃣ Pulizia file temporanei
    fs.unlinkSync(oggPath);
    fs.unlinkSync(wavPath);

    console.log(`🗣️ Voce trascritta correttamente → "${text}"`);
    return text;
  } catch (err) {
    console.error("❌ Errore in transcribeVoiceMessage:", err.message);
    if (oggPath && fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    if (wavPath && fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
    return "";
  }
}
