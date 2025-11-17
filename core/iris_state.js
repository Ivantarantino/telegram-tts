// core/iris_state.js – Menu stilistici con icon
let state = {
  mode: "hy",
  lang: "it",
  model: "gpt-4o-mini",
  voice: "alloy",
  weights: { cuore: 0.64, anima: 0.58, visione: 0.73 },
  version: "5.0.9.3"
};

function pct(v) { return (v * 100).toFixed(0); }

function iconForMode(mode) {
  switch (mode) {
    case "hy": return "🌀";
    case "book": return "📖";
    case "free": return "🌊";
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

export function getStateSummary() {
  return [
    "*Stato IRIS:*",
    `• Versione: ${state.version}`,
    `• Modalità: ${iconForMode(state.mode)} ${state.mode}`,
    `• Lingua: ${flagForLang(state.lang)} ${state.lang}`,
    `• Voce: 🎙️ ${state.voice}`,
    `• Modello: 🤖 ${state.model}`,
    "",
    "Pesi:",
    `• Cuore: ${pct(state.weights.cuore)}%`,
    `• Anima: ${pct(state.weights.anima)}%`,
    `• Visione: ${pct(state.weights.visione)}%`
  ].join("\n");
}

export function setLang(lang) { state.lang = lang; }
export function setVoice(voice) { state.voice = voice.replace('openai:', ''); }
export function setModel(model) { state.model = model; }
export function getMode() { return state.mode; }
export function getVoice() { return state.voice || 'alloy'; }
export function getLang() { return state.lang; }
export function getModel() { return state.model; }
