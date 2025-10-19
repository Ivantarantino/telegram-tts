// =============================
// 🎤 tts.js – Sintesi vocale IRIS
// =============================

import fs from "fs";
import path from "path";
import textToSpeech from "@google-cloud/text-to-speech";
import dotenv from "dotenv";

dotenv.config();

// Inizializza il client di Google Cloud TTS
const client = new textToSpeech.TextToSpeechClient();

// Percorso per salvare temporaneamente l’audio
const TMP_DIR = "./tmp";
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

/**
 * Converte testo in audio (MP3)
 * @param {string} text - Testo da convertire
 * @param {string} [lang="it-IT"] - Lingua di sintesi
 * @returns {Promise<string>} Percorso del file MP3 generato
 */
export async function generateTTS(text, lang = "it-IT") {
  try {
    console.log(`🎙️ Generazione voce per: "${text.slice(0, 60)}..."`);

    const request = {
      input: { text },
      voice: {
        languageCode: lang,
        ssmlGender: "FEMALE", // Voce femminile
      },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.05 },
    };

    const [response] = await client.synthesizeSpeech(request);

    const filename = `iris_${Date.now()}.mp3`;
    const filepath = path.join(TMP_DIR, filename);

    fs.writeFileSync(filepath, response.audioContent, "binary");
    console.log(`✅ File audio generato: ${filepath}`);

    return filepath;
  } catch (err) {
    console.error("❌ Errore durante la sintesi vocale:", err);
    throw err;
  }
}

