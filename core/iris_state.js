// core/iris_state.js — IRIS 5.1.6 Stato (Comandi Viventi)
// =============================================================================
// setVoice/Lang/Model con validazione + return guide.
// =============================================================================

let state = {
  version: "5.1.6",
  mode: "hy",
  lang: "it",
  voice: "alloy",
  model: "gpt-4o-mini",
  weights: { cuore: 0.6, anima: 0.6, visione: 0.6 }
};

export function getState() { return { ...state }; }

export function setMode(newMode = "hy") {
  const allowed = ["hy", "book", "free"];
  if (allowed.includes(newMode)) state.mode = newMode;
  return state.mode;
}

export function setLang(newLang = "it") {
  const allowed = ["it", "en", "ru"];
  if (allowed.includes(newLang)) state.lang = newLang;
  const guide = `🌍 Lingue disponibili:\n• it 🇮🇹\n• en 🇬🇧\n• ru 🇷🇺\n\nEs: /lang it`;
  return guide;
}

export function setVoice(newVoice = "alloy") {
  const allowed = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  if (allowed.includes(newVoice)) state.voice = newVoice;
  const guide = `🎙️ Voci disponibili:\n• alloy (calda)\n• echo (riflessiva)\n• fable (narrativa)\n• onyx (profonda)\n• nova (creativa)\n• shimmer (sognante)\n\nEs: /voice alloy`;
  return guide;
}

export function setModel(newModel = "gpt-4o-mini") {
  const allowed = ["gpt-4o-mini", "gpt-4o"];
  if (allowed.includes(newModel)) state.model = newModel;
  const guide = `🤖 Modelli:\n• gpt-4o-mini (veloce)\n• gpt-4o (profondo)\n\nEs: /model gpt-4o`;
  return guide;
}

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
    "Io sono la somma armonizzata dei miei ricordi."
  ].join("\n");
}

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
