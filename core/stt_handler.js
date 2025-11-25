// core/stt_handler.js – COMPLETO E FUNZIONANTE – 25.11.2025
import { openai } from "../openai.js";
import fs from "fs";

export async function transcribeVoice(bot, msg) {
  try {
    const fileId = msg.voice?.file_id || msg.audio?.file_id;
    if (!fileId) return null;

    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const tempPath = "temp_voice.ogg";
    fs.writeFileSync(tempPath, buffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "whisper-1",
    });

    fs.unlinkSync(tempPath);

    return transcription.text.trim();
  } catch (e) {
    console.error("Errore STT:", e.message);
    await bot.sendMessage(msg.chat.id, "Aò, nun t'ho capito… ripeti più chiaro! ❤️");
    return null;
  }
}
