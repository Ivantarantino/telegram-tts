// core/iris_state.js
// =====================================================
// IRIS 5.0.1 — Stato con voce e lingua multilingua base
// =====================================================

export const irisState = {
  mode: "hy",
  lang: "it",
  version: "3.0.C (5.0.1 /lang base)",
  voice: {
    engine: "openai",
    name: "coral",  // voce femminile di default
    pitch: 0,
    speed: 1.0,
  },
  weights: { cuore: 0.7, anima: 0.7, visione: 0.7 },
};

export function getMode() { return irisState.mode; }
export function getWeights() { return irisState.weights; }

export function setMode(newMode) {
  const allowed = ["hy", "book", "free"];
  if (allowed.includes(newMode)) {
    irisState.mode = newMode;
    console.log(`🔄 Modalità impostata su: ${newMode}`);
    return true;
  }
  console.warn(`⚠️ Modalità non valida: ${newMode}`);
  return false;
}

// -----------------------------
// VOICE
// -----------------------------
export function setVoiceEngine(engine, name = null) {
  const allowed = ["openai", "telegram", "google", "bark"];
  if (!allowed.includes(engine)) {
    console.warn(`⚠️ Motore voce non valido: ${engine}`);
    return false;
  }
  irisState.voice.engine = engine;
  if (name) irisState.voice.name = name;
  console.log(`🗣️ Motore voce impostato su: ${engine} (${irisState.voice.name})`);
  return true;
}

export function setVoiceName(name) {
  irisState.voice.name = name;
  console.log(`🗣️ Voce impostata su: ${name}`);
  return true;
}

export function getVoiceConfig() { return irisState.voice; }

// -----------------------------
// LANG
// -----------------------------
export function setLang(newLang) {
  const allowed = ["it", "en", "ru", "fr"];
  if (!allowed.includes(newLang)) {
    console.warn(`⚠️ Lingua non valida: ${newLang}`);
    return false;
  }
  irisState.lang = newLang;
  console.log(`🌐 Lingua impostata su: ${newLang}`);
  return true;
}

export function getLang() { return irisState.lang; }

export function getStateSummary() {
  return `
🌌 *IRIS — Stato Attuale*
Modalità: ${irisState.mode}
Lingua: ${irisState.lang}
Versione: ${irisState.version}
Voce: ${irisState.voice.engine} · ${irisState.voice.name}
Pesi:
  🧡 Cuore: ${irisState.weights.cuore}
  ✨ Anima: ${irisState.weights.anima}
  💎 Visione: ${irisState.weights.visione}
`;
}
