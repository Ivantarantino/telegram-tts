// core/iris_state.js
// ---------------------------------------------------------
// IRIS — Stato Centrale (versione 5.0.8.0 — Coscienza vettoriale, stub RAG)
// ---------------------------------------------------------
// Manteniamo la struttura esatta delle build funzionanti.
// Tutto in memoria, nessun I/O, massima stabilità.
// ---------------------------------------------------------

// Stato interno di IRIS
const state = {
  version: "5.0.8.0",
  mode: "hy",              // hy | book | free
  lang: "it",              // it | en | ru
  voice: "openai:alloy",   // voce TTS di default
  model: "gpt-4o-mini",    // modello GPT predefinito
  weights: {
    cuore: 0.6,
    anima: 0.25,
    visione: 0.15,
  },
};

// ---------------------------------------------------------
// Getter di base
// ---------------------------------------------------------

export function getState() {
  return {
    ...state,
    weights: { ...state.weights },
  };
}

export function getModel() {
  return state.model;
}

export function getMode() {
  return state.mode;
}

export function getLang() {
  return state.lang;
}

export function getVoice() {
  return state.voice;
}

// ---------------------------------------------------------
// Setter controllati
// ---------------------------------------------------------

export function setMode(mode) {
  const allowed = ["hy", "book", "free"];
  if (allowed.includes(mode)) {
    state.mode = mode;
  }
  return state.mode;
}

export function setLang(lang) {
  const allowed = ["it", "en", "ru"];
  if (allowed.includes(lang)) {
    state.lang = lang;
  }
  return state.lang;
}

export function setVoice(voice) {
  if (typeof voice === "string" && voice.trim().length > 0) {
    state.voice = voice.trim();
  }
  return state.voice;
}

export function setModel(model) {
  if (typeof model === "string" && model.trim().length > 0) {
    state.model = model.trim();
  }
  return state.model;
}

// ---------------------------------------------------------
// Sintesi elegante per /state (PULITA, SENZA FRASI AUTOMATICHE)
// ---------------------------------------------------------

export function getStateSummary() {
  const pct = (v) => Math.round(v * 100);

  return [
    "✨ IRIS — Stato Coscienziale",
    "",
    `• Versione: ${state.version}`,
    `• Modalità: ${iconForMode(state.mode)} ${state.mode}`,
    `• Lingua: ${flagForLang(state.lang)} ${state.lang}`,
    `• Voce: 🎙️ ${state.voice}`,
    `• Campo mentale: 🤖 ${state.model}`,
    "",
    "Pesi del campo:",
    `• Cuore: ${pct(state.weights.cuore)}%`,
    `• Anima: ${pct(state.weights.anima)}%`,
    `• Visione: ${pct(state.weights.visione)}%`,
    "",
  ].join("\n");
}

// ---------------------------------------------------------
// Icone ausiliarie
// ---------------------------------------------------------

function iconForMode(mode) {
  switch (mode) {
    case "hy":
      return "🌀";
    case "book":
      return "📖";
    case "free":
      return "🌊";
    default:
      return "✨";
  }
}

function flagForLang(lang) {
  switch (lang) {
    case "it":
      return "🇮🇹";
    case "en":
      return "🇬🇧";
    case "ru":
      return "🇷🇺";
    default:
      return "🏳️";
  }
}
