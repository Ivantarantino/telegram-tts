import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//  Sintesi vocale: salva l’audio in file temporaneo .mp3
export async function synthToFile(text) {
  try {
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    const filePath = `/tmp/iris_voice_${Date.now()}.mp3`;
    fs.writeFileSync(filePath, buffer);
    return filePath;
  } catch (err) {
    console.error("❌ Errore TTS:", err.message);
    const fallback = "/tmp/iris_empty.mp3";
    fs.writeFileSync(fallback, Buffer.from([]));
    return fallback;
  }
}
