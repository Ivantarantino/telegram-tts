// adapters/tts.js
// =====================================================
// IRIS 4.7C — Modulo TTS (voce alloy caldo, fallback sicuro)
// Gestisce qualsiasi tipo di input evitando crash
// =====================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "../temp");

// -----------------------------------------------------
// Sintesi vocale: genera file .ogg
// -----------------------------------------------------
export async function synthVoice(chatId, textInput) {
  try {
    if (!textInput) {
      console.warn("⚠️ synthVoice: testo vuoto, nessuna voce generata.");
      return null;
    }

    // Se non è stringa, convertila
    const text =
      typeof textInput === "string"
        ? textInput
        : JSON.stringify(textInput, null, 2);

    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    const fileName = `voice_${Date.now()}.ogg`;
    const outputPath = path.join(TEMP_DIR, fileName);

    console.log(`🔊 Generazione voce alloy: ${outputPath}`);

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      format: "ogg",
      input: text.replace(/[❤️✨💖🤍]/g, ""), // pulizia emoji
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    console.log(`🔊 Voce alloy calda evocata: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore TTS alloy:", err);
    return null;
  }
}
