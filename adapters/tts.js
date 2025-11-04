// =============================================================
// adapters/tts.js
// IRIS 3.0G — TTS (4.7 restore)
// -------------------------------------------------------------
// Usa l’SDK OpenAI, modello gpt-4o-mini-tts, formato opus (.ogg)
// come nelle build che ti hanno generato:
// "🔊 Voce generata: /opt/render/project/src/temp/voice_XXXX.ogg"
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

    // pulizia emoji
    const cleanText = text.replace(/[💎🌸⚡❤️✨]/g, "").trim();

    console.log("🎧 Genero voce per:", cleanText.slice(0, 80));

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: cleanText,
      format: "opus"
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    console.log(`🔊 Voce generata: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore generazione voce:", err.message);
    return null;
  }
}
