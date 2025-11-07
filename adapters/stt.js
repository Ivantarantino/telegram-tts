// src/adapters/stt.js
// IRIS – STT per Telegram usando download via fetch
// Niente axios, niente ffmpeg. Logga la dimensione del file per debug.
// Che il Daje sia con Noi 💎

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Scarica il vocale Telegram usando il link pubblico
 * e lo salva in /tmp come .ogg
 * @param {object} bot
 * @param {string} fileId
 * @returns {Promise<string>} percorso locale del file
 */
export async function downloadTelegramVoice(bot, fileId) {
  // 1) ottieni il link pubblico da Telegram
  const fileUrl = await bot.getFileLink(fileId);

  // 2) scarica con fetch (nativo in Node 22)
  const resp = await fetch(fileUrl);
  if (!resp.ok) {
    throw new Error(`Download Telegram fallito: ${resp.status} ${resp.statusText}`);
  }

  const arrayBuf = await resp.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  // 3) salva in /tmp
  const tmpPath = path.resolve(`/tmp/${fileId}.ogg`);
  fs.writeFileSync(tmpPath, buf);

  // 4) logghiamo la dimensione per capire se è audio vero
  console.log(`📦 Audio Telegram salvato: ${tmpPath} (${buf.length} bytes)`);

  return tmpPath;
}

/**
 * Trascrive il file .ogg direttamente con Whisper
 * Forziamo italiano per aiutare i vocali brevi.
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
      language: "it",
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
    // 1) scarica .ogg
    oggPath = await downloadTelegramVoice(bot, fileId);

    // 2) trascrivi
    const text = await transcribeWithWhisper(oggPath);

    // 3) pulizia
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
