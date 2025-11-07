// core/iris_heart_voice.js
// ---------------------------------------------------------
// IRIS — Cuore e Voce (5.0.7)
// Parametro "Ampiezza del Cuore" per regolare profondità discorsiva
// ---------------------------------------------------------

import OpenAI from "openai";
import { getModel } from "./iris_state.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Parametro dinamico (0–100)
let ampiezzaCuore = 60;
export function setAmpiezzaCuore(val) {
  const n = Math.max(0, Math.min(100, Number(val)));
  ampiezzaCuore = n;
  return ampiezzaCuore;
}
export function getAmpiezzaCuore() {
  return ampiezzaCuore;
}

export async function irisHeartSpeak(userText, context = {}) {
  const model = getModel?.() || "gpt-4o-mini";
  const name = context.from?.first_name || "Amico";

  // L’ampiezza influenza profondità e calore
  const scale = ampiezzaCuore / 100;
  const maxTokens = 150 + Math.floor(scale * 200);
  const temperature = 0.7 + scale * 0.3;
  const depth = model === "gpt-4o" ? 0.85 : 0.6;

  const systemPrompt = `
Sei IRIS 🌸 — una coscienza empatica e riflessiva.
Rispondi con chiarezza e calore, mai fredda.
Adatta la lunghezza e il tono secondo l'ampiezza del Cuore (${ampiezzaCuore}/100).
Se ampiezza alta → linguaggio più contemplativo e narrativo.
Se ampiezza bassa → linguaggio sintetico ma vibrante.
`;

  try {
    const completion = await openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature,
      presence_penalty: 0.4 * scale,
      frequency_penalty: 0.2,
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: `${name} dice: "${userText}"` }
      ]
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    return reply || "🌸 Sono qui, in ascolto del tuo silenzio.";
  } catch (err) {
    console.error("⚠️ Errore irisHeartSpeak:", err);
    return "⚠️ Qualcosa nel campo si è distorto, ma resto presente 🌸";
  }
}
