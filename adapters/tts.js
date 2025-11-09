// adapters/tts.js
// ---------------------------------------------------------
// IRIS — TTS Adapter
// Genera un file .ogg in /tmp e ritorna il path
// Usato da adapters/telegram_bot.js → sendVoiceFromText(...)
// ---------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai"; // già in package.json nella tua build

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// directory temporanea su Render
const TMP_DIR = "/tmp";

// voce di default: la tua build usa openai:alloy
const DEFAULT_VOICE = "alloy";
// modello TTS stabile per ora
const DEFAULT_MODEL = "gpt-4o-mini-tts";

// ci serve lo stato per sapere quale voce usare → lo leggiamo dinamicamente
async function resolveVoice() {
  // non importiamo direttamente core/iris_state.js per non creare loop
  // l'adapter Telegram ci passa già la voce selezionata, ma qui mettiamo un fallback
  return DEFAULT_VOICE;
}

/**
 * Genera un vocale da un testo e ritorna il path al file .ogg
 * @param {string} text
 * @param {string} voiceName (opzionale)
 * @returns {Promise<string>} path del file .ogg da mandare a Telegram
 */
export async function synthVoice(text, voiceName = null) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️ OPENAI_API_KEY non impostata: ritorno un file finto.");
    const fakePath = path.join(TMP_DIR, "iris_dummy.ogg");
    fs.writeFileSync(fakePath, "");
    return fakePath;
  }

  const voice = voiceName || (await resolveVoice());

  // filename un po' unico
  const fileName = `iris_voice_${Date.now()}.ogg`;
  const outPath = path.join(TMP_DIR, fileName);

  try {
    // nuova API OpenAI v4.x
    const response = await openai.audio.speech.create({
      model: DEFAULT_MODEL,
      voice: voice,
      format: "opus",          // per Telegram va bene .ogg/opus
      input: text
    });

    // la SDK restituisce uno stream/arrayBuffer → lo salviamo su disco
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outPath, buffer);

    return outPath;
  } catch (err) {
    console.error("❌ Errore TTS:", err.message);
    // fallback: file vuoto così il bot non crasha
    fs.writeFileSync(outPath, "");
    return outPath;
  }
}
