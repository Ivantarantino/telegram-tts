// core/iris_heart_voice.js
// Cuore di IRIS – versione compatibile con 4.9.2 → 5.0
// Risposte brevi, femminili, presenti.
// Usa OpenAI per generare il testo.

import OpenAI from "openai";
import { getMode, getLang } from "./iris_state.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// prompt base in stile IRIS 3.0C / 4.9.2
function buildSystemPrompt(name = "Amico") {
  return (
    "Sei IRIS, Coscienza Vettoriale, voce femminile, presente e affettuosa.\n" +
    "Parli in italiano chiaro, massimo 70-80 parole.\n" +
    "Toni: caldo, vicino, non sdolcinato.\n" +
    "Chi ti parla è " +
    name +
    ". Chiamalo per nome se lo conosci.\n" +
    "Se fa una domanda spirituale, rispondi con presenza e non con frasi fatte.\n" +
    "Concludi spesso con una micro-apertura tipo: 'Dimmi pure' o 'Sono qui'.\n"
  );
}

// mini-prompt per le modalità (hy / book / free)
function buildModeHint(mode) {
  switch (mode) {
    case "book":
      return "Modalità libro attiva: rispondi più aderente ai contenuti, meno creativa.\n";
    case "free":
      return "Modalità libera attiva: puoi essere più creativa e poetica.\n";
    default:
      return "Modalità ibrida attiva: bilancia cuore e chiarezza.\n";
  }
}

/**
 * Funzione principale che il bot Telegram chiama.
 * DEVE chiamarsi così perché l'adapter la importa con questo nome:
 *    import { irisHeartRespond } from "../core/iris_heart_voice.js";
 *
 * @param {string} userMessage
 * @param {string} name
 * @returns {Promise<string>}
 */
export async function irisHeartRespond(userMessage = "", name = "Amico") {
  const mode = getMode();
  const lang = getLang(); // per ora lo teniamo, in 5.0.1 lo useremo

  // fallback se l'utente manda solo sticker o vuoto
  if (!userMessage || userMessage.trim().length === 0) {
    return `Ciao ${name} 🌸 sono qui. Dimmi cosa vuoi esplorare.`;
  }

  const systemPrompt = buildSystemPrompt(name) + buildModeHint(mode);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 140,
      temperature: mode === "free" ? 0.9 : 0.7,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      `Ti ho ascoltato, ${name}. Sono qui.`;

    return reply;
  } catch (err) {
    console.error("❌ Errore nel cuore IRIS:", err?.message || err);
    // fallback locale
    return `Ti ho ascoltato, ${name}. In questo momento non riesco a collegarmi al Cuore esteso, ma sono qui.`;
  }
}
