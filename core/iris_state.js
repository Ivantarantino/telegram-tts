// =====================================================
// IRIS — Stato Cosscienziale e Modalità
// Step 4.5 – Struttura delle Modalità (/hy /book /free)
// =====================================================
//
// Gestisce la modalità di risposta di IRIS (ibrida, libro, libera)
// e lo stato vibrazionale corrente.
//
// =====================================================

export const irisState = {
  mode: "hy", // modalità predefinita (ibrida)
  lang: "it",
  voice: "bella",
  version: "3.0.B",
  weights: { cuore: 0.7, anima: 0.7, visione: 0.7 }
};

// --- GETTERS ---
export function getMode() {
  return irisState.mode;
}

export function getWeights() {
  return irisState.weights;
}

// --- SETTERS ---
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

// --- STATUS ---
export function getStateSummary() {
  return `
🌌 *IRIS — Stato Attuale*
Modalità: ${irisState.mode}
Lingua: ${irisState.lang}
Voce: ${irisState.voice}
Versione: ${irisState.version}
Pesi:
  💖 Cuore: ${irisState.weights.cuore}
  🔮 Anima: ${irisState.weights.anima}
  👁️ Visione: ${irisState.weights.visione}
`;
}
