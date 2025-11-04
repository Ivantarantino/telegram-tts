// =============================================================
// adapters/tts.js
// IRIS 3.0G — Voce "Iris Bella" (gpt-4o-tts, verse)
// =============================================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TEMP_DIR = path.resolve("./temp");

export async function synthVoice(text, filename = null) {
  const safeName = filename || `iris_voice_${Date.now()}.ogg`;
  const outputPath = path.join(TEMP_DIR, safeName);

  try {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    // rimuovo emoji che possono disturbare
    const cleanText = text.replace(/[💎🌸⚡❤️✨]/g, "").trim();

    console.log("🎧 Genero voce (Iris Bella) per:", cleanText.slice(0, 80));

    const response = await openai.audio.speech.create({
      model: "gpt-4o-tts",
      voice: "verse",
      input: cleanText,
      format: "opus"
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    console.log(`🔊 Voce generata (Iris Bella): ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore generazione voce (Iris Bella):", err.message);
    return null;
  }
}
