// core/iris_state.js
// Stato centrale di IRIS — v5.0.3 “Empatia & Modelli Linguistici”

const state = {
  version: "IRIS 3.0C – 5.0.3 Empatia & Modelli Linguistici",
  mode: "hy", // hy | book | free
  weights: {
    heart: 1.0,
    soul: 1.0,
    vision: 1.0,
  },
  voiceEngine: "alloy", // voce di default
  lang: "it", // lingua di default
  linguisticModelEngine: "openai:alloy", // nuovo campo
};

// --- MODE ---
export function setMode(newMode) {
  if (["hy", "book", "free"].includes(newMode)) state.mode = newMode;
}
export function getMode() {
  return state.mode;
}

// --- VOICE ---
export function setVoiceEngine(engineName) {
  const allowed = ["alloy", "coral", "verse", "fable", "onyx", "nova"];
  if (allowed.includes(engineName)) state.voiceEngine = engineName;
}
export function getVoiceEngine() {
  return state.voiceEngine;
}

// --- LINGUA ---
export function setLang(newLang) {
  const allowed = ["it", "en", "ru"];
  if (allowed.includes(newLang)) state.lang = newLang;
}
export function getLang() {
  return state.lang;
}

// --- LINGUISTIC MODEL ENGINE ---
export function setLinguisticModelEngine(engine) {
  state.linguisticModelEngine = engine;
}
export function getLinguisticModelEngine() {
  return state.linguisticModelEngine;
}

// --- SUMMARY ---
export function getStateSummary() {
  return [
    "🧠 Stato di IRIS",
    `• Versione: ${state.version}`,
    `• Modalità: ${state.mode}`,
    `• Voce: ${state.voiceEngine} 🎤`,
    `• Lingua: ${state.lang} 🌍`,
    `• Modello linguistico: ${state.linguisticModelEngine}`,
    `• Pesi: ❤️ ${state.weights.heart} – ✨ ${state.weights.soul} – 💎 ${state.weights.vision}`,
  ].join("\n");
}
