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

    const cleanText = text.replace(/[💎🌸⚡❤️✨]/g, "").trim();
    console.log("🎧 Genero voce (Iris Bella 2.0) per:", cleanText.slice(0, 80));

    // 🔹 modello TTS aggiornato e stabile
    const response = await openai.audio.speech.create({
      model: "gpt-4o-audio-preview",
      voice: "alloy",
      input: cleanText,
      format: "opus"
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log(`🔊 Voce generata correttamente: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore generazione voce (Iris Bella 2.0):", err.message);
    return null;
  }
}
