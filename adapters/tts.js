import fs from "fs";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function synthVoice(text, filename = "voice.ogg") {
  try {
    const path = `./temp/${filename}`;
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(path, buffer);
    console.log(`🔊 Voce generata: ${path}`);
    return path;
  } catch (err) {
    console.error("Errore TTS:", err);
    return null;
  }
}
