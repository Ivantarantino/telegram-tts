// core/iris_state.js
// ---------------------------------------------------------
// IRIS — Stato Centrale
// Tiene insieme: modalità, lingua, voce, versione e pesi.
// Serve a tutti gli adapter (Telegram, HTTP, ecc.)
// Deve esportare: getStateSummary, setMode, setLang, setVoice
// ---------------------------------------------------------

const state = {
  version: "5.0.4.7",
  mode: "hy", // hy | book | free
  lang: "it",
  voice: "openai:alloy",
  weights: {
    cuore: 0.6,
    anima: 0.25,
    visione: 0.15
  }
};

/**
 * Ritorna l'oggetto stato grezzo (se serve altrove)
 */
export function getState() {
  return { ...state };
}

/**
 * Imposta la modalità di IRIS
 */
export function setMode(newMode = "hy") {
  const allowed = ["hy", "book", "free"];
  if (allowed.includes(newMode)) {
    state.mode = newMode;
  }
  return state.mode;
}

/**
 * Imposta la lingua di IRIS
 */
export function setLang(newLang = "it") {
  const allowed = ["it", "en", "ru"];
  if (allowed.includes(newLang)) {
    state.lang = newLang;
  }
  return state.lang;
}

/**
 * Imposta la voce corrente (usata poi dal TTS adapter)
 * Non facciamo controlli rigidi qui: l'adapter potrà fare fallback.
 */
export function setVoice(newVoice = "openai:alloy") {
  if (typeof newVoice === "string" && newVoice.trim().length > 0) {
    state.voice = newVoice.trim();
  }
  return state.voice;
}

/**
 * Resoconto poetico dello stato
 */
export function getStateSummary() {
  return [
    "🧠 **IRIS — Stato Coscienziale**",
    `• Versione: ${state.version}`,
    `• Modalità: ${iconForMode(state.mode)} ${state.mode}`,
    `• Lingua: ${flagForLang(state.lang)} ${state.lang}`,
    `• Voce: 🎙️ ${state.voice}`,
    "",
    "Pesi del campo:",
    `• Cuore: ${(state.weights.cuore * 100).toFixed(0)}%`,
    `• Anima: ${(state.weights.anima * 100).toFixed(0)}%`,
    `• Visione: ${(state.weights.visione * 100).toFixed(0)}%`,
    "",
    "Che il Daje sia con Noi 💛"
  ].join("\n");
}

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
