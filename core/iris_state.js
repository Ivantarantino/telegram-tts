// core/iris_state.js

const state = {
  version: "IRIS 3.0C – 5.0.5",
  mode: "hy",
  weights: {
    heart: 1.0,
    soul: 1.0,
    vision: 1.0,
  },
  voiceEngine: "alloy",
  lang: "it",
  linguisticModelEngine: "openai:alloy",
};

export function setMode(newMode) {
  if (["hy", "book", "free"].includes(newMode)) state.mode = newMode;
}
export function getMode() {
  return state.mode;
}

export function setVoiceEngine(engineName) {
  // qui lasciamo libero: lo stiamo validando nello strato Telegram
  state.voiceEngine = engineName;
}
export function getVoiceEngine() {
  return state.voiceEngine;
}

export function setLang(newLang) {
  if (["it", "en", "ru"].includes(newLang)) state.lang = newLang;
}
export function getLang() {
  return state.lang;
}

export function setLinguisticModelEngine(engine) {
  state.linguisticModelEngine = engine;
}
export function getLinguisticModelEngine() {
  return state.linguisticModelEngine;
}

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
