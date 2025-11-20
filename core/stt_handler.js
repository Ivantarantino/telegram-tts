// core/stt_handler.js
// Gestione vocale con OpenAI Whisper – zero tocco al cuore di index.js
import { openai } from "../openai.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function transcribeVoice(bot, msg) {
  const chatId = msg.chat.id;
  const voice = msg.voice || msg.audio;
  if (!voice) return null;

  try {
    // Scarica il file vocale
    const file = await bot.getFile(voice.file_id);
    const filePath = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
    
    // Download temporaneo
    const response = await fetch(filePath);
    const buffer = Buffer.from(await response.arrayBuffer());
    const tempPath = path.join(__dirname, "../temp_voice.ogg");
    fs.writeFileSync(tempPath, buffer);

    // Trascrizione con Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "whisper-1",
      language: "it"
    });

    // Pulizia
    fs.unlinkSync(tempPath);

    console.log(`🎙️ Vocale trascritto: "${transcription.text}"`);
    return transcription.text;

  } catch (err) {
    console.error("STT fallito:", err.message);
    await bot.sendMessage(chatId, "Non sono riuscita a capire il tuo vocale… puoi riscriverlo? ❤️");
    return null;
  }
}
