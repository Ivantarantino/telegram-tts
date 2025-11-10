// core/iris_state.js — IRIS 5.1.3 Stato (Voce Stringa)
// =============================================================================
// Gestione mode, lang, voice (stringa), model. Default voice: 'alloy'.
// =============================================================================

let state = {
  version: "5.1.3",
  mode: "hy",
  lang: "it",
  voice: "alloy",  // Stringa pura, no numero
  model: "gpt-4o-mini",
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
 * 🔹 Imposta la voce corrente (stringa pura)
 */
export function setVoice(newVoice = "alloy") {
  // Forza stringa valida
  const voiceMap = { 1: "alloy", 2: "echo", 3: "fable", 4: "onyx", 5: "nova", 6: "shimmer" };
  if (typeof newVoice === 'number') newVoice = voiceMap[newVoice] || "alloy";
  if (typeof newVoice === "string" && newVoice.trim().length > 0) {
    state.voice = newVoice.trim().split(':').pop() || "alloy";  // Pulisci 'openai:'
  }
  return state.voice;
}

/**
 * 🔹 Imposta il modello GPT
 */
export function setModel(newModel = "gpt-4o-mini") {
  const allowed = ["gpt-4o-mini", "gpt-4o"];
  if (allowed.includes(newModel)) {
    state.model = newModel;
  }
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

// Icone ausiliarie
function iconForMode(mode) {
  switch (mode) {
    case "hy": return "🌀";
    case "book": return "📚";
    case "free": return "🌸";
    default: return "✨";
  }
}

function flagForLang(lang) {
  switch (lang) {
    case "it": return "🇮🇹";
    case "en": return "🇬🇧";
    case "ru": return "🇷🇺";
    default: return "🏳️";
  }
}
