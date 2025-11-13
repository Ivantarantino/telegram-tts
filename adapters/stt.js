// adapters/stt.js
// ---------------------------------------------------------
// STT per IRIS (Telegram)
// - Usa OpenAI Whisper per trascrivere vocali Telegram
// - Esporta sia transcribeAudio(bot, fileId) che transcribeVoice(fileUrl)
//   per compatibilità con tutte le versioni precedenti.
// ---------------------------------------------------------

import OpenAI from "openai";
import fs from "fs";
import os from "os";
import path from "path";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API,
});

/**
 * Scarica un file audio da URL in un file temporaneo locale.
 */
async function downloadToTempFile(fileUrl, ext = "ogg") {
  if (!fileUrl) {
    throw new Error("downloadToTempFile: fileUrl mancante");
  }

  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`downloadToTempFile: HTTP ${res.status} su ${fileUrl}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tmpPath = path.join(
    os.tmpdir(),
    `iris-voice-${Date.now()}.${ext}`
  );
  await fs.promises.writeFile(tmpPath, buffer);
  return tmpPath;
}

/**
 * Trascrive un file audio locale con Whisper.
 */
async function whisperTranscribeLocal(filePath) {
  if (!filePath) {
    throw new Error("whisperTranscribeLocal: filePath mancante");
  }

  const fileStream = fs.createReadStream(filePath);

  const result = await client.audio.transcriptions.create({
    model: "whisper-1",
    file: fileStream,
    // puoi forzare la lingua se vuoi: language: "it",
  });

  const text =
    (result.text && result.text.trim && result.text.trim()) ||
    String(result.text || "").trim();

  console.log("🗣️ Trascrizione Whisper:", JSON.stringify(text));

  return text;
}

/**
 * Core: trascrive da URL (usata anche da transcribeVoice).
 */
async function transcribeFromUrl(fileUrl) {
  const tmpPath = await downloadToTempFile(fileUrl, "oga");
  try {
    return await whisperTranscribeLocal(tmpPath);
  } finally {
    // best effort: pulizia file temporaneo
    try {
      await fs.promises.unlink(tmpPath);
    } catch {
      /* ignore */
    }
  }
}

/**
 * ✅ Compat: versione che si aspetta SOLO l'URL del file
 * (stile 5.0.8.0: Telegram_bot si occupa di fare getFile/getFileLink).
 */
export async function transcribeVoice(fileUrl) {
  if (!fileUrl) {
    throw new Error("transcribeVoice: fileUrl mancante");
  }
  return transcribeFromUrl(fileUrl);
}

/**
 * ✅ Nuova API: transcribeAudio(botInstance, fileId)
 * - botInstance: istanza di node-telegram-bot-api
 * - fileId: msg.voice.file_id
 *
 * Questa è quella che il tuo telegram_bot.js sta importando adesso.
 */
export async function transcribeAudio(botInstance, fileId) {
  if (!botInstance) {
    throw new Error("transcribeAudio: botInstance mancante");
  }
  if (!fileId) {
    throw new Error("transcribeAudio: fileId mancante");
  }

  const token =
    process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
  if (!token) {
    throw new Error(
      "transcribeAudio: TELEGRAM_BOT_TOKEN/TELEGRAM_TOKEN mancante in ENV"
    );
  }

  // Prende info file da Telegram
  const file = await botInstance.getFile(fileId);
  if (!file || !file.file_path) {
    throw new Error("transcribeAudio: file_path mancante nella risposta Telegram");
  }

  const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  console.log("🎧 URL vocale Telegram:", fileUrl);

  return transcribeFromUrl(fileUrl);
}

// ---------------------------------------------------------
// (Facoltativo) alias per evitare future sorprese
// ---------------------------------------------------------

// Alcune vecchie versioni potrebbero importare default.
// Manteniamo un default innocuo che punta a transcribeVoice.
export default {
  transcribeAudio,
  transcribeVoice,
};
