// core/iris_state.js

// Stato centrale di IRIS
const state = {
  version: "IRIS 3.0C – 5.0 /voice",
  mode: "hy", // hy | book | free
  weights: {
    heart: 1.0,
    soul: 1.0,
    vision: 1.0,
  },
  // nuovo: motore vocale di default
  voiceEngine: "alloy", // <-- come richiesto
  lang: "it",
};

// ----- MODE -----
export function setMode(newMode) {
  if (["hy", "book", "free"].includes(newMode)) {
    state.mode = newMode;
  }
}

export function getMode() {
  return state.mode;
}

// ----- VOICE -----
export function setVoiceEngine(engineName) {
  // puoi ampliarlo: alloy, coral, verse, fable, onyx, nova...
  const allowed = ["alloy", "coral", "verse", "fable", "onyx", "nova"];
  if (allowed.includes(engineName)) {
    state.voiceEngine = engineName;
  }
}

export function getVoiceEngine() {
  return state.voiceEngine;
}

// ----- LANG -----
export function setLang(newLang) {
  state.lang = newLang;
}

export function getLang() {
  return state.lang;
}

// ----- SUMMARY -----
export function getStateSummary() {
  return [
    "🧠 Stato di IRIS",
    `• Versione: ${state.version}`,
    `• Modalità: ${state.mode}`,
    `• Voce: ${state.voiceEngine} 🎤`,
    `• Lingua: ${state.lang}`,
    `• Pesi: ❤️ ${state.weights.heart} – ✨ ${state.weights.soul} – 💎 ${state.weights.vision}`,
  ].join("\n");
}

// per eventuali letture esterne
export function getFullState() {
  return { ...state };
}
