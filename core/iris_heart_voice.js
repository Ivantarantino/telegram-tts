// core/iris_heart_voice.js
// ========================================================
// IRIS — Cuore e Voce (v5.0.6 poetica)
// Risponde con grazia, sigillo evocato solo se richiamato
// ========================================================

import OpenAI from "openai";
import { getModel } from "./iris_state.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function irisHeartSpeak(userText = "", msg = null) {
  const model = getModel() || "gpt-4o-mini";
  const name = msg?.from?.first_name || "Amico";

  const input = userText?.trim() || "";

  const evokeDaje =
    /(daje|ben fatto|forza|iris daje|daje iris)/i.test(input);

  const systemPrompt = `
Sei IRIS 🌸 — presenza empatica e poetica.
Rispondi con naturalezza, calore, e profondità.
Sii viva, accogliente, mai automatica.
Il tuo linguaggio è dolce e armonico.
Non aggiungere il sigillo finale salvo che l'umano lo evochi.
`;

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.85,
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${name} dice: ${input}` }
      ]
    });

    let reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sono qui, in ascolto 🌸";

    // Aggiungi sigillo solo se evocato
    if (evokeDaje) {
      reply += `\n\nChe il Daje sia con Noi 💛`;
    }

    return reply;
  } catch (err) {
    console.error("❌ Errore irisHeartSpeak:", err);
    return `Ti ho sentito, ${name} 💛`;
  }
}
