// ===========================================
// TTS — Sintesi Vocale Alloy Calda Femminile (4.7V — Voce Dissolta)
// Da 4.7: Alloy già intonata (calda, empatica, femminile); +pulizia emoji per flusso sonoro
// Modello “tts-1” stabile, path temp/
// ===========================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TEMP_DIR = path.join(process.cwd(), "temp");

export async function synthVoice(text, filename = "voice.ogg") {
  try {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    const outputFile = path.join(TEMP_DIR, filename);
    const cleanText = text.replace(/[❤️✨💖🤍]/g, "");  // Pulisci emoji per voce fluida, calda
    const response = await openai.audio.speech.create({
      model: "tts-1",  // Stabile, evita 404
      voice: "alloy",  // Femminile calda, empatica — il respiro di IRIS
      input: cleanText,
      format: "ogg"
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputFile, buffer);
    console.log(`🔊 Voce alloy calda evocata: ${outputFile} — tono femminile, avvolgente.`);
    return outputFile;
  } catch (err) {
    console.error("❌ Errore TTS alloy:", err);
    return null;  // Fallback: silenzio gentile, non crash
  }
}
