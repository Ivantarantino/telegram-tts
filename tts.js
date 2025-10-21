// tts.js — Voce con OpenAI TTS
const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function synthToFile(text, outDir = "temp") {
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `voice_${Date.now()}.mp3`);
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text
  });
  const buffer = Buffer.from(await speech.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  return outPath;
}

module.exports = { synthToFile };
