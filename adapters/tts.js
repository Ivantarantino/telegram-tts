// adapters/tts.js
// =====================================================
// IRIS 5.3.1 — Motore TTS (fix input type)
// =====================================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Voce di default impostata su Alloy
let voiceEngine = { provider: "openai", name: "alloy" };

export function setVoiceEngine(provider, name) {
  voiceEngine = { provider, name };
  console.log(`🗣️ Motore voce impostato su: ${provider} (${name})`);
}

export async function synthVoice(text) {
  const safeText = String(text || "").trim() || "…";
  const tempPath = path.resolve(`./temp/voice_${Date.now()}.ogg`);

  try {
    if (voiceEngine.provider === "openai") {
      const response = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: voiceEngine.name || "alloy",
        input: safeText,
        format: "ogg",
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(tempPath, buffer);
      console.log(`🔊 Voce generata e inviata — openai:${voiceEngine.name}`);
    }

    return tempPath;
  } catch (err) {
    console.error("❌ Errore TTS:", err.message);
    return null;
  }
}
