// core/iris_state.js
// =====================================================
// IRIS 4.7C — Stato Centrale (Mode, Lingua, Voce, Pesi)
// =====================================================

export const irisState = {
  mode: "hy",
  lang: "it",
  voice: "bella",
  version: "3.0.C (4.7C stabile)",
  weights: { cuore: 0.7, anima: 0.7, visione: 0.7 },
};

export function getMode() {
  return irisState.mode;
}

export function getWeights() {
  return irisState.weights;
}

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

export function setWeights(newWeights) {
  irisState.weights = { ...irisState.weights, ...newWeights };
  return irisState.weights;
}

export function getStateSummary() {
  return `
🌌 *IRIS — Stato Attuale*
Modalità: ${irisState.mode}
Lingua: ${irisState.lang}
Voce: ${irisState.voice}
Versione: ${irisState.version}
Pesi:
  🧡 Cuore: ${irisState.weights.cuore}
  ✨ Anima: ${irisState.weights.anima}
  💎 Visione: ${irisState.weights.visione}
`;
}
