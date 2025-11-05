// ===========================================
// IRIS State — Stato Centrale (4.7)
// Da 3.0B: mode, weights, getStateSummary()
// ===========================================

export const irisState = {
  mode: "hy",
  lang: "it",
  voice: "alloy",
  version: "3.0.4.7",
  weights: { cuore: 0.7, anima: 0.7, visione: 0.7 }
};

export function getStateSummary() {
  return `
🌌 *IRIS — Stato Attuale (4.7)*
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
