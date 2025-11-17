// adapters/tts.js – Fix voice validation
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VALID_VOICES = ['nova', 'shimmer', 'echo', 'onyx', 'fable', 'alloy', 'ash', 'sage', 'coral'];

export async function synthToFile(text, outputPath, voice = "alloy") {
  try {
    if (!VALID_VOICES.includes(voice)) {
      console.warn(`⚠️ Voice '${voice}' invalid, fallback to 'alloy'`);
      voice = 'alloy';
    }
    if (!text.trim()) throw new Error("Testo vuoto.");

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: text,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log(`🔊 Audio: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ TTS error:", err.message);
    throw err;
  }
}
