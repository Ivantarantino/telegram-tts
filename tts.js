// =============================================================
// IRIS 3.8.8 – TTS (Text to Speech)
// Genera voce in base alla risposta generata.
// =============================================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function speak(text, voice_mode = "neutral") {
  const outputFile = `tts_${Date.now()}.ogg`;
  const filePath = path.join("./", outputFile);

  const voice = voice_mode === "sensual" ? "alloy" : voice_mode === "cosmic" ? "verse" : "nova";

  const mp3 = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: voice,
    input: text
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return buffer;
}

export default { speak };
