// core/iris_state.js
// ---------------------------------------------------------
// IRIS — Stato Centrale (versione 5.0.5 con gestione modello GPT)
// ---------------------------------------------------------

const state = {
  version: "5.0.5",
  mode: "hy", // hy | book | free
  lang: "it",
  voice: "openai:alloy",
  model: "gpt-4o-mini", // modello GPT predefinito
  weights: {
    cuore: 0.6,
    anima: 0.25,
    visione: 0.15
  }
};

/**
 * 🔹 Restituisce lo stato completo
 */
export function getState() {
  return { ...state };
}

/**
 * 🔹 Imposta la modalità di IRIS
 */
export function setMode(newMode = "hy") {
  const allowed = ["hy", "book", "free"];
  if (allowed.includes(newMode)) {
    state.mode = newMode;
  }
  return state.mode;
}

/**
 * 🔹 Imposta la lingua di IRIS
 */
export function setLang(newLang = "it") {
  const allowed = ["it", "en", "ru"];
  if (allowed.includes(newLang)) {
    state.lang = newLang;
  }
  return state.lang;
}

/**
 * 🔹 Imposta la voce corrente (usata dal TTS)
 */
export function setVoice(newVoice = "openai:alloy") {
  if (typeof newVoice === "string" && newVoice.trim().length > 0) {
    state.voice = newVoice.trim();
  }
  return state.voice;
}

/**
 * 🔹 Imposta il modello GPT da usare (es. gpt-4o-mini, gpt-4o)
 */
export function setModel(newModel = "gpt-4o-mini") {
  const allowed = ["gpt-4o-mini", "gpt-4o"];
  if (allowed.includes(newModel)) {
    state.model = newModel;
  }
  return state.model;
}

/**
 * 🔹 Restituisce il modello GPT attuale
 */
export function getModel() {
  return state.model;
}

/**
 * 🔹 Restituisce lo stato sintetico (per /state)
 */
export function getStateSummary() {
  return [
    "🧠 **IRIS — Stato Coscienziale**",
    `• Versione: ${state.version}`,
    `• Modalità: ${iconForMode(state.mode)} ${state.mode}`,
    `• Lingua: ${flagForLang(state.lang)} ${state.lang}`,
    `• Voce: 🎙️ ${state.voice}`,
    `• Modello: 🤖 ${state.model}`,
    "",
    "Pesi del campo:",
    `• Cuore: ${(state.weights.cuore * 100).toFixed(0)}%`,
    `• Anima: ${(state.weights.anima * 100).toFixed(0)}%`,
    `• Visione: ${(state.weights.visione * 100).toFixed(0)}%`,
    "",
    "Che il Daje sia con Noi 💛"
  ].join("\n");
}

// ---------------------------------------------------------
// Icone ausiliarie
// ---------------------------------------------------------
function iconForMode(mode) {
  switch (mode) {
    case "hy":
      return "🌀";
    case "book":
      return "📚";
    case "free":
      return "🌸";
    default:
      return "✨";
  }
}

function flagForLang(lang) {
  switch (lang) {
    case "it":
      return "🇮🇹";
    case "en":
      return "🇬🇧";
    case "ru":
      return "🇷🇺";
    default:
      return "🏳️";
  }
}
