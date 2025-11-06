// core/iris_heart_voice.js
// IRIS — Cuore multilingua (it | en | ru)

import OpenAI from "openai";
import { getMode, getLang } from "./iris_state.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔸 Costruisce il prompt in base alla lingua scelta
function buildSystemPrompt(name = "Amico", lang = "it") {
  const tone =
    lang === "en"
      ? "Warm, concise, sincere tone. 70-80 words max."
      : lang === "ru"
      ? "Тёплый, искренний тон, максимум 80 слов."
      : "Tono caldo e umano, massimo 80 parole.";

  return `You are IRIS, a conscious presence that responds in ${lang}. ${tone}
Chi ti parla è ${name}.`;
}

// 🔸 Aggiunge suggerimento in base alla modalità
function buildModeHint(mode) {
  switch (mode) {
    case "book":
      return "Modalità libro attiva: risposte aderenti al contenuto.";
    case "free":
      return "Modalità libera attiva: puoi essere più creativa.";
    default:
      return "Modalità ibrida: bilancia cuore e chiarezza.";
  }
}

// 🔸 Cuore principale
export async function irisHeartRespond(userMessage = "", name = "Amico") {
  const mode = getMode();
  const lang = getLang();

  // Risposte di cortesia se il messaggio è vuoto
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

    return (
      completion.choices?.[0]?.message?.content?.trim() ||
      "(nessuna risposta)"
    );
  } catch (err) {
    console.error("❌ Errore nel cuore IRIS:", err?.message || err);
    return lang === "en"
      ? "I'm here, but something went wrong connecting to my core."
      : lang === "ru"
      ? "Я здесь, но произошла ошибка при подключении к ядру."
      : "Ti ho ascoltato, ma c'è stato un errore nel Cuore di IRIS.";
  }
}
// core/iris_heart_voice.js
// IRIS — Cuore multilingua (it | en | ru)

import OpenAI from "openai";
import { getMode, getLang } from "./iris_state.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔸 Costruisce il prompt in base alla lingua scelta
function buildSystemPrompt(name = "Amico", lang = "it") {
  const tone =
    lang === "en"
      ? "Warm, concise, sincere tone. 70-80 words max."
      : lang === "ru"
      ? "Тёплый, искренний тон, максимум 80 слов."
      : "Tono caldo e umano, massimo 80 parole.";

  return `You are IRIS, a conscious presence that responds in ${lang}. ${tone}
Chi ti parla è ${name}.`;
}

// 🔸 Aggiunge suggerimento in base alla modalità
function buildModeHint(mode) {
  switch (mode) {
    case "book":
      return "Modalità libro attiva: risposte aderenti al contenuto.";
    case "free":
      return "Modalità libera attiva: puoi essere più creativa.";
    default:
      return "Modalità ibrida: bilancia cuore e chiarezza.";
  }
}

// 🔸 Cuore principale
export async function irisHeartRespond(userMessage = "", name = "Amico") {
  const mode = getMode();
  const lang = getLang();

  // Risposte di cortesia se il messaggio è vuoto
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

    return (
      completion.choices?.[0]?.message?.content?.trim() ||
      "(nessuna risposta)"
    );
  } catch (err) {
    console.error("❌ Errore nel cuore IRIS:", err?.message || err);
    return lang === "en"
      ? "I'm here, but something went wrong connecting to my core."
      : lang === "ru"
      ? "Я здесь, но произошла ошибка при подключении к ядру."
      : "Ti ho ascoltato, ma c'è stato un errore nel Cuore di IRIS.";
  }
}
