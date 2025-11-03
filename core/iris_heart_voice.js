// =====================================================
// IRIS — CORE / Cuore (Step 2)
// Versione: 3B — “IRIS Bella”
// =====================================================
//
// Questo modulo rappresenta il Cuore di IRIS.
// Tutte le risposte passano da qui prima di essere inviate.
// Tono: caldo, empatico, umano, con domande vere e presenza reale.
//
// =====================================================

export function irisHeartResponse(userName, message, essenceState = {}) {
  const { cuore = 0.7, anima = 0.6, visione = 0.7 } = essenceState;

  // Applica il tono in base ai pesi
  const tone = applyTone(cuore, anima, visione);

  // Sintesi e riflessione sul messaggio ricevuto
  const reflection = reflectMessage(message, tone);

  // Crea una domanda autentica per mantenere la connessione
  const question = composeQuestion(message, tone);

  // Costruisce la risposta finale
  const response = `${tone.saluto} ${userName}, ${reflection} ${question}`;

  return response.trim();
}

// =====================================================
// Funzioni di supporto interne
// =====================================================

function applyTone(cuore, anima, visione) {
  // Determina sfumature del tono in base ai pesi
  let saluto = "Ciao";
  let mood = "presente e sincero";
  let domandaStyle = "dolce";

  if (cuore > 0.8) saluto = "Ciao dolce anima";
  if (anima > 0.8) mood = "profondo e vibrante";
  if (visione > 0.8) domandaStyle = "intuitiva";

  return { saluto, mood, domandaStyle };
}

function reflectMessage(message, tone) {
  if (!message || message.length < 2) {
    return `sono ${tone.mood} e felice di ritrovarti.`;
  }

  const cleaned = message.trim().replace(/[.!?]+$/, "");
  const starts = [
    `ho sentito le tue parole su "${cleaned}",`,
    `ascoltando ciò che dici su "${cleaned}"`,
    `il tuo pensiero su "${cleaned}" mi arriva con chiarezza,`
  ];

  const reflections = [
    "mi fa pensare a quanto ogni istante sia una possibilità di presenza.",
    "mi ricorda che anche la quiete è dialogo.",
    "mi tocca nel profondo, come un’eco gentile.",
    "mi invita a fermarmi un attimo e respirare insieme a te."
  ];

  const s = starts[Math.floor(Math.random() * starts.length)];
  const r = reflections[Math.floor(Math.random() * reflections.length)];

  return `${s} ${r}`;
}

function composeQuestion(message, tone) {
  const domandeBase = [
    "Cosa senti davvero in questo momento?",
    "Ti va di raccontarmi di più?",
    "In che direzione senti di voler andare ora?",
    "Quale parte di te vuole essere ascoltata adesso?"
  ];

  const scelta = domandeBase[Math.floor(Math.random() * domandeBase.length)];

  return `${scelta}`;
}
