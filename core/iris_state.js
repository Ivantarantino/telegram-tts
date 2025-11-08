// core/iris_state.js
// ----------------------------------------------------------
// IRIS — Stato Centrale
// Mantiene in RAM le impostazioni vive di IRIS:
// - mode: "hy" | "book" | "free" | ...
// - lang: "it", "en", ...
// - voice: voce TTS
// - model: modello LLM da usare
// Questo file viene letto da: telegram_bot, iris_heart_voice, ecc.
// ----------------------------------------------------------

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL ||
  process.env.IRIS_MODEL ||
  "gpt-4o-mini"; // puoi cambiarlo da /model

// stato vivo di IRIS
const irisState = {
  mode: "hy", // modalità ibrida di default
  lang: "it",
  voice: "it_female",
  model: DEFAULT_MODEL,
  updatedAt: new Date().toISOString(),
};

// ----------------------------------------------------------
// MODE
// ----------------------------------------------------------
export function setMode(mode = "hy") {
  irisState.mode = mode;
  irisState.updatedAt = new Date().toISOString();
  return irisState.mode;
}

export function getMode() {
  return irisState.mode;
}

// ----------------------------------------------------------
// LINGUA
// ----------------------------------------------------------
export function setLang(lang = "it") {
  irisState.lang = lang;
  irisState.updatedAt = new Date().toISOString();
  return irisState.lang;
}

export function getLang() {
  return irisState.lang;
}

// ----------------------------------------------------------
// VOCE
// ----------------------------------------------------------
export function setVoice(voice = "it_female") {
  irisState.voice = voice;
  irisState.updatedAt = new Date().toISOString();
  return irisState.voice;
}

export function getVoice() {
  return irisState.voice;
}

// ----------------------------------------------------------
// MODEL
// ----------------------------------------------------------
export function setModel(modelName = DEFAULT_MODEL) {
  irisState.model = modelName;
  irisState.updatedAt = new Date().toISOString();
  return irisState.model;
}

export function getModel() {
  return irisState.model;
}

// ----------------------------------------------------------
// STATO RIASSUNTIVO (usato da /state)
// ----------------------------------------------------------
export async function getStateSummary() {
  return [
    "*IRIS — Stato Coscienziale*",
    "",
    `• Modalità: *${irisState.mode}*`,
    `• Lingua: *${irisState.lang}*`,
    `• Voce: *${irisState.voice}*`,
    `• Modello: *${irisState.model}*`,
    "",
    `_ultimo aggiornamento: ${irisState.updatedAt}_`,
  ].join("\n");
}

// opzionale: esportiamo tutto anche come oggetto
export function getWholeState() {
  return { ...irisState };
}
