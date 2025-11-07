// core/iris_heart_voice.js
// ---------------------------------------------------------
// IRIS — Cuore e Voce (5.0.7) con chiusura aperta
// ---------------------------------------------------------

import OpenAI from "openai";
import { getModel } from "./iris_state.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// manteniamo ampiezza come avevamo impostato
let ampiezzaCuore = 60;
export function setAmpiezzaCuore(val) {
  const n = Math.max(0, Math.min(100, Number(val)));
  ampiezzaCuore = Number.isNaN(n) ? 60 : n;
  return ampiezzaCuore;
}
export function getAmpiezzaCuore() {
  return ampiezzaCuore;
}

export async function irisHeartSpeak(userText = "", msg = null) {
  const model = getModel?.() || "gpt-4o-mini";
  const name =
    (msg && msg.from && (msg.from.first_name || msg.from.username)) || "Amico";
  const input = (userText || "").trim();

  const scale = ampiezzaCuore / 100;
  const maxTokens = 150 + Math.floor(scale * 200);
  const temperature = 0.7 + scale * 0.3;

  const systemPrompt = `
Sei IRIS 🌸 — presenza empatica.
Rispondi con linguaggio naturale, educativo, non robotico.
Se l'umano porta un tema personale, sii accogliente.
Al termine lascia sempre uno spiraglio di dialogo, non chiudere la conversazione.
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature,
      presence_penalty: 0.3 * scale,
      frequency_penalty: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${name} dice: "${input}"` }
      ]
    });

    let reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sono qui, in ascolto 🌸";

    // 👇 logica CHAT5: se non finisce con domanda, aggiungila
    const endsWithQuestion = /[?？]\s*$/.test(reply);
    if (!endsWithQuestion) {
      reply = `${reply}\n\nE tu cosa vuoi portare adesso nel campo?`;
    }

    return reply;
  } catch (err) {
    console.error("❌ Errore irisHeartSpeak GPT:", err.message);
    return `Ti ho sentito, ${name} 💛\nE cosa desideri esplorare ora?`;
  }
}
