import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// 🔹 Funzione principale: genera il parlato da testo
async function speak(text, voiceMode = "default") {
  try {
    const ttsEndpoint = process.env.TTS_ENDPOINT || "http://localhost:8001/speak";
    const response = await axios.post(ttsEndpoint, { text, voiceMode }, { responseType: "arraybuffer" });

    const filePath = path.resolve(`./audio_${Date.now()}.mp3`);
    fs.writeFileSync(filePath, Buffer.from(response.data));
    console.log(`🔊 Audio generato e salvato in: ${filePath}`);
    return fs.readFileSync(filePath);
  } catch (error) {
    console.error("❌ Errore in tts.speak:", error.message);
    return null;
  }
}

// 🔹 Funzione di test (opzionale)
async function testConnection() {
  console.log("🔎 Test connessione TTS...");
  try {
    const response = await axios.get(process.env.TTS_ENDPOINT || "http://localhost:8001/status");
    console.log("✅ TTS attivo:", response.data);
  } catch (err) {
    console.warn("⚠️ TTS non raggiungibile:", err.message);
  }
}

// ✅ Compatibilità piena con index.js
export default { speak, testConnection };
export { speak, testConnection };
