// =============================================================
// IRIS 3.0G — TTS Adapter (Voce del Cuore)
// -------------------------------------------------------------
// Converte testo in voce calda .ogg (formato Telegram).
// =============================================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TEMP_DIR = path.resolve("./temp");

export async function synthVoice(text, filename = null) {
  try {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    const safeName = filename || `iris_voice_${Date.now()}.ogg`;
    const outputPath = path.join(TEMP_DIR, safeName);

    // 🔹 Rimuove emoji o simboli che possono confondere il TTS
    const cleanText = text.replace(/[💎🌸⚡❤️✨]/g, "").trim();

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy", // voce femminile naturale, calda
      input: cleanText,
      format: "opus"
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log(`🔊 Voce generata: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore generazione voce:", err);
    return null;
  }
}
