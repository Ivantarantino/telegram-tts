// src/adapters/tts.js
// =======================================================
// IRIS — Text-to-Speech Adapter 5.x
// Genera voce con modello OpenAI (es. gpt-4o-mini-tts)
// Invio vocale Telegram con caption “IRIS 🌸”
// =======================================================

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Risolve il percorso locale del file (necessario su Render)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crea una funzione sicura per generare il vocale
export async function sendVoice(bot, chatId, text, voiceModel = "openai:alloy", caption = "IRIS 🌸") {
  try {
    // Se il testo è vuoto o nullo, evita la chiamata TTS
    if (!text || text.trim().length === 0) {
      await bot.sendMessage(chatId, "⚠️ Nessun testo da convertire in voce.");
      return;
    }

    // Scegli modello in base a voce impostata
    const [engine, model] = voiceModel.split(":");
    let voice = "alloy"; // default
    if (model) voice = model;

    // Nome file temporaneo (Render non supporta fs persistente, ma va bene per tmp)
    const outPath = path.join(__dirname, "voice.ogg");

    // Richiesta a OpenAI TTS (voce Alloy, Coral o Verse)
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice,
      input: text,
      format: "ogg", // compatibile Telegram
    });

    // Ottieni l’audio come buffer
    const buffer = Buffer.from(await response.arrayBuffer());

    // Scrivi temporaneamente il file (Render lo cancellerà dopo)
    fs.writeFileSync(outPath, buffer);

    // Invia vocale su Telegram con caption IRIS 🌸
    await bot.sendVoice(chatId, outPath, { caption });

    // Rimuovi il file temporaneo
    fs.unlink(outPath, (err) => {
      if (err) console.warn("⚠️ Impossibile cancellare file temporaneo:", err.message);
    });

    console.log(`🔊 Voce generata e inviata (${chatId}) — ${voiceModel}`);
  } catch (err) {
    console.error("❌ Errore TTS:", err.message || err);
    await bot.sendMessage(chatId, "⚠️ Errore nella generazione vocale. Ti rispondo comunque in testo.");
  }
}
