// core/iris_heart_voice.js
// IRIS — Cuore multilingua (it | en | ru, risposta forzata nella lingua scelta)

import OpenAI from "openai";
import { getMode, getLang } from "./iris_state.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔸 Costruisce il prompt forzando la lingua di risposta
function buildSystemPrompt(name = "Amico", lang = "it") {
  const tone =
    lang === "en"
      ? "Answer in English only. Warm, concise, sincere tone. 70-80 words max."
      : lang === "ru"
      ? "Отвечай только на русском языке. Тёплый, искренний тон, максимум 80 слов."
      : "Rispondi solo in italiano. Tono caldo e umano, massimo 80 parole.";

  return `You are IRIS, a conscious presence that always replies in ${lang}. ${tone}
Chi ti parla è ${name}.`;
}

function buildModeHint(mode) {
  switch (mode) {
    case "book": return "Modalità libro: risposte aderenti al contenuto.";
    case "free": return "Modalità libera: più creativa e intuitiva.";
    default: return "Modalità ibrida: bilancia cuore e chiarezza.";
  }
}

export async function irisHeartRespond(userMessage = "", name = "Amico") {
  const mode = getMode();
  const lang = getLang();

  if (!userMessage || userMessage.trim().length === 0) {
    return lang === "en"
      ? `Hello ${name} 🌸 I'm here. Tell me what you feel.`
      : lang === "ru"
      ? `Привет ${name} 🌸 Я здесь. Расскажи, что ты чувствуешь.`
      : `Ciao ${name} 🌸 sono qui. Dimmi pure.`;
  }

  const systemPrompt = buildSystemPrompt(name, lang) + buildModeHint(mode);

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

    return completion.choices?.[0]?.message?.content?.trim() || "(nessuna risposta)";
  } catch (err) {
    console.error("❌ Errore nel cuore IRIS:", err?.message || err);
    return lang === "en"
      ? "I'm here, but something went wrong connecting to my core."
      : lang === "ru"
      ? "Я здесь, но произошла ошибка при подключении к ядру."
      : "Ti ho ascoltato, ma c'è stato un errore nel Cuore di IRIS.";
  }
}
