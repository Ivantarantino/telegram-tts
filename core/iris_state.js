// core/iris_state.js – Stub per state, getStateSummary
let state = {
  mode: "hy",
  lang: "it",
  model: "gpt-4o-mini",
  voice: "alloy",
  weights: { cuore: 0.64, anima: 0.58, visione: 0.73 },
  version: "5.0.9.3"
};

export function getStateSummary() {
  return `
*Stato IRIS:*
- Modalità: ${state.mode}
- Lingua: ${state.lang}
- Modello: ${state.model}
- Voce: ${state.voice}
- Pesi: Cuore ${state.weights.cuore} | Anima ${state.weights.anima} | Visione ${state.weights.visione}
  `.trim();
}

export function setLang(lang) { state.lang = lang; }
export function setVoice(voice) { state.voice = voice; }
export function setModel(model) { state.model = model; }
export function getMode() { return state.mode; }
export function getVoice() { return state.voice; }
