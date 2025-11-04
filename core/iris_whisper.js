// ===========================================================
// IRIS Whisper Core — Trascrizione vocale automatica
// ===========================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, "../temp");

// Assicurati che la cartella temp esista
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// ===========================================================
// Funzione principale di trascrizione
// ===========================================================
export async function whisperTranscribe(audioUrl) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error("❌ OPENAI_API_KEY mancante nelle variabili d’ambiente.");
    }

    console.log(`🎧 Avvio trascrizione con Whisper da: ${audioUrl}`);

    // Scarica il file audio da Telegram
    const response = await fetch(audioUrl);
    const audioBuffer = await response.arrayBuffer();
    const filePath = path.join(tempDir, `input_${Date.now()}.ogg`);
    fs.writeFileSync(filePath, Buffer.from(audioBuffer));

    // Invia richiesta a Whisper API
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));
    formData.append("model", "whisper-1");
    formData.append("language", "it");

    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiApiKey}` },
      body: formData,
    });

    const data = await whisperResponse.json();
    fs.unlinkSync(filePath); // elimina file temporaneo

    if (data.text) {
      console.log(`🗣️ Trascrizione Whisper: ${data.text}`);
      return data.text.trim();
    } else {
      console.error("❌ Errore Whisper:", data);
      return "Non riesco a trascrivere chiaramente questo audio.";
    }
  } catch (err) {
    console.error("❌ Errore nella trascrizione Whisper:", err);
    return "Errore durante la trascrizione vocale.";
  }
}
