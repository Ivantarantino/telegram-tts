/**
 * 🎙️ IRIS – Modulo TTS (Google Cloud)
 * Output nativo: OGG_OPUS (perfetto per Telegram Voice a 1x/2x)
 * Compatibile con IRIS 2.1 (CommonJS), Render e variabile GOOGLE_APPLICATION_CREDENTIALS.
 */

const fs = require("fs");
const path = require("path");
const util = require("util");
const textToSpeech = require("@google-cloud/text-to-speech");

// Client Google TTS (richiede GOOGLE_APPLICATION_CREDENTIALS su Render)
const client = new textToSpeech.TextToSpeechClient();

// Directory temporanea per file audio
const TEMP_DIR = path.resolve("./temp_audio");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * Genera un file vocale .ogg (Opus) da testo.
 * @param {string} text - Testo da convertire in voce
 * @param {object} options - Opzioni opzionali
 * @param {string} [options.languageCode="it-IT"] - Codice lingua
 * @param {string} [options.voiceName="it-IT-Wavenet-D"] - Nome voce (Google Wavenet)
 * @param {number} [options.speakingRate=1.0] - Velocità parlato (0.25–4.0)
 * @param {number} [options.pitch=0.0] - Pitch (-20.0–20.0)
 * @param {string} [options.basename] - Base del filename (senza estensione)
 * @returns {Promise<string>} Percorso del file .ogg generato
 */
async function generateTTS_Google(text, options = {}) {
  try {
    const {
      languageCode = "it-IT",
      voiceName = "it-IT-Wavenet-D",
      speakingRate = 1.0,
      pitch = 0.0,
      basename
    } = options;

    if (!text || !text.trim()) {
      throw new Error("⚠️ Nessun testo da convertire in voce.");
    }

    const filename = `${basename || "iris_tts"}_${Date.now()}.ogg`;
    const filePath = path.join(TEMP_DIR, filename);

    const request = {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
        // ssmlGender è opzionale se usi "name"; lasciamo neutro
      },
      audioConfig: {
        audioEncoding: "OGG_OPUS", // ✅ formato ideale per Telegram voice
        speakingRate,
        pitch
      }
    };

    const [response] = await client.synthesizeSpeech(request);
    await util.promisify(fs.writeFile)(filePath, response.audioContent, "binary");

    console.log(`🎧 File vocale (Google) generato: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error("❌ Errore Google TTS:", err);
    throw err;
  }
}

/**
 * Pulizia dei file vocali temporanei più vecchi di 'expiryMs' millisecondi (default 10min).
 * @param {number} expiryMs
 */
function cleanTempAudioGoogle(expiryMs = 10 * 60 * 1000) {
  try {
    const now = Date.now();
    const files = fs.readdirSync(TEMP_DIR);
    files.forEach((f) => {
      const fp = path.join(TEMP_DIR, f);
      const st = fs.statSync(fp);
      if (now - st.mtimeMs > expiryMs) {
        fs.unlinkSync(fp);
      }
    });
  } catch (err) {
    console.error("⚠️ Errore pulizia temp_audio:", err);
  }
}

module.exports = {
  generateTTS_Google,
  cleanTempAudioGoogle,
};
