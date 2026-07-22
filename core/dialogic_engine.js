export function classifyTurnGesture(userText) {
  const text = String(userText || "").trim().toLowerCase();
  if (!text) return "other";

  const boundaryTriggers = [
    "non voglio analizzarla",
    "non voglio parlarne",
    "basta così",
    "mi pesa e basta",
    "non analizzare",
    "fermati",
    "lascia stare"
  ];

  if (boundaryTriggers.some((trigger) => text.includes(trigger))) {
    return "boundary";
  }

  const ragExplicitTriggers = [
    "nel rapporto",
    "secondo il rapporto",
    "secondo il testo",
    "nel testo",
    "nel documento",
    "cosa dice"
  ];

  const isRagExplicit =
    ragExplicitTriggers.some((trigger) => text.includes(trigger)) ||
    (text.includes("cosa sono") &&
      (text.includes("rapporto") || text.includes("vesica") || text.includes("biblioteca")));

  if (isRagExplicit) {
    return "rag_explicit";
  }

  const libraryTerms = [
    "ecka",
    "veca",
    "vesica",
    "rhevo",
    "rapporto vesica",
    "kristal",
    "iris manifesto",
    "biblioteca",
    "nel testo",
    "secondo il rapporto",
    "kathara",
    "griglie kathara",
    "griglia kathara",
    "atomi seme",
    "atomo seme",
    "spirale kristallo",
    "unita di radiazione",
    "unità di radiazione",
    "camere amoraea",
    "mappe di porte stellari",
    "porte stellari",
    "codici geomantici",
    "programmi elettro-tonali",
    "quadranti ecka-veca"
  ];

  const simpleExplanationSignals = [
    "spiegami",
    "in parole povere",
    "spiegami semplice",
    "spiegami in modo semplice",
    "non capisco",
    "parti da zero",
    "come a un bambino",
    "fammi un esempio",
    "con una metafora"
  ];

  if (
    libraryTerms.some((term) => text.includes(term)) &&
    simpleExplanationSignals.some((signal) => text.includes(signal))
  ) {
    return "didactic_library";
  }

  const didacticBasicTriggers = [
    "non so nulla",
    "spiegami semplice",
    "spiegami in modo semplice",
    "non capisco",
    "parti da zero",
    "in parole povere",
    "come a un bambino",
    "fammi un esempio",
    "con una metafora"
  ];

  if (didacticBasicTriggers.some((trigger) => text.includes(trigger))) {
    return "didactic_basic";
  }

  const generalExplanationTriggers = [
    "spiegami",
    "cos'è",
    "che cos'è",
    "cosa significa",
    "a cosa serve",
    "fammi capire"
  ];

  const technicalMarkers = [
    "trasformata continua",
    "trasformata discreta",
    "dft",
    "fft",
    "spettro",
    "dominio della frequenza",
    "dominio del tempo",
    "fase",
    "ampiezza",
    "convoluzione",
    "kernel",
    "serie di fourier",
    "campionamento",
    "aliasing",
    "armoniche"
  ];

  if (
    generalExplanationTriggers.some((trigger) => text.includes(trigger)) &&
    !technicalMarkers.some((marker) => text.includes(marker))
  ) {
    return "didactic_basic";
  }

  const learningOrRagTriggers = [
    "spiegami",
    "analizza",
    "che cos'è",
    "cosa significa",
    "nel rapporto",
    "secondo il testo",
    "biblioteca",
    "fourier",
    "ecka",
    "veca"
  ];

  if (learningOrRagTriggers.some((trigger) => text.includes(trigger))) {
    return "other";
  }

  const hasDeathSignal =
    /\b(morte|morto|morta|lutto)\b/i.test(text) ||
    /\b(fratello|sorella|padre|madre)\b/i.test(text) &&
      /\b(morto|morta|lutto)\b/i.test(text);

  const vulnerabilityTriggers = [
    "mi fa male",
    "mi pesa",
    "sento il vuoto",
    "ho paura",
    "mi vergogno"
  ];

  if (hasDeathSignal || vulnerabilityTriggers.some((trigger) => text.includes(trigger))) {
    return "vulnerability";
  }

  return "other";
}

export function resolveDirectReply({ irisMode, gesture }) {
  if (irisMode === "hy" && gesture === "boundary") {
    return "Va bene. Non la analizziamo.";
  }

  if (irisMode === "hy" && gesture === "vulnerability") {
    return "Mi arriva. Non provo a spiegarlo. Resto qui con rispetto.";
  }

  return null;
}

export function shouldUseHybridSearch({ irisMode, gesture }) {
  return (
    irisMode === "hy" &&
    !["boundary", "vulnerability"].includes(gesture)
  );
}

export function buildHyDialogicPlan({ userText, irisMode }) {
  const gesture = irisMode === "hy" ? classifyTurnGesture(userText) : "other";
  const directReply = resolveDirectReply({ irisMode, gesture });
  const useHybridSearch = shouldUseHybridSearch({ irisMode, gesture });

  return {
    gesture,
    directReply,
    useHybridSearch
  };
}
