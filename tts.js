import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === GENERATORE DI FILE AUDIO ===
export async function generateTTS(text) {
  try {
    const outputDir = "temp";
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const timestamp = Date.now();
    const outputPath = path.join(outputDir, `iris_voice_${timestamp}.ogg`);

    console.log(`🎧 Generazione vocale...`);
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      format: "ogg",
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    console.log(`🎧 File vocale generato: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore nella generazione vocale:", err);
    throw err;
  }
}
