// =============================================================
// adapters/tts.js
// IRIS 3.0G — 4.9-E Voce via fetch (compatibile Render)
// =============================================================

import fs from "fs";
import path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEMP_DIR = path.resolve("./temp");

export async function synthVoice(text, filename = null) {
  if (!OPENAI_API_KEY) {
    console.warn("⚠️ OPENAI_API_KEY mancante: salto generazione voce.");
    return null;
  }

  const safeName = filename || `iris_voice_${Date.now()}.ogg`;
  const outputPath = path.join(TEMP_DIR, safeName);

  try {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    // rimuovo emoji che possono dare fastidio
    const cleanText = text.replace(/[💎🌸⚡❤️✨]/g, "").trim();

    console.log("🎧 Genero voce (fetch) per:", cleanText.slice(0, 80));

    const res = await fetch("https://api.openai.com/v1/audio/speech/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-audio-preview",
        voice: "alloy",
        input: cleanText,
        format: "opus"
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("❌ Errore OpenAI TTS:", res.status, errText);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, buffer);

    console.log(`🔊 Voce generata e salvata in: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore generazione voce (fetch):", err.message);
    return null;
  }
}
