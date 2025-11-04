// =============================================================
// adapters/tts.js
// IRIS 3.0G — TTS con log di debug (fase 4.9-C)
// -------------------------------------------------------------
// Converte testo in voce calda .ogg (Telegram compatibile)
// e scrive log dettagliati su Render per il debug.
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

    console.log("🎧 Avvio generazione voce per:", text.slice(0, 80));

    const cleanText = text.replace(/[💎🌸⚡❤️✨]/g, "").trim();

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: cleanText,
      format: "opus"
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    console.log(`🔊 Voce generata correttamente: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore nella generazione vocale:", err.message);
    return null;
  }
}
