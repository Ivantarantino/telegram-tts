// core/iris_rag_resonance.js
// -------------------------------------------------------------
// IRIS 5.1 — RAG Resonance Engine (fase 1: pesatura 𝜑)
// Calcola quanto una query merita profondità e quanta ampiezza
// deve avere la risposta, tenendo conto della modalità attuale.
// -------------------------------------------------------------

// mappa di base: quanto la modalità "spinge" i token
const MODE_TOKEN_MAP = {
  hy: 0,       // ibrido: base
  free: 100,   // più creativo
  book: 150,   // più ancorato a documenti
  essence: 80,
  state: -150
};

// soglie base prese dal Rapporto_Stato_9.md
// 𝜑 < 0.4 → risposta breve (200)
// 𝜑 ≈ 0.7 → riflessiva (400)
// 𝜑 ≥ 0.9 → immersione (650 + RAG)
// -------------------------------------------------------------

/**
 * stimaBasePhi: stima una densità concettuale della query
 * qui usiamo euristiche semplici (lunghezza, presenza di parole chiave)
 * in seguito potremo sostituire con embedding reale
 */
function stimaBasePhi(query = "") {
  const q = query.trim().toLowerCase();

  if (!q) return 0.3;

  let score = 0.3;

  // lunghezza
  if (q.length > 80) score += 0.15;
  if (q.length > 160) score += 0.1;

  // parole che di solito chiedono profondità nel tuo ecosistema
  const paroleDensita = [
    "anima",
    "sovranità",
    "essenza",
    "rag",
    "coscienza",
    "vettoriale",
    "griglia",
    "archetipo",
    "lyra",
    "emanazione",
    "programma"
  ];

  for (const p of paroleDensita) {
    if (q.includes(p)) {
      score += 0.08;
    }
  }

  // clamp
  if (score > 1) score = 1;
  return Number(score.toFixed(2));
}

/**
 * calcolaTokenDaPhi: traduce 𝜑 in token base
 */
function calcolaTokenDaPhi(phi) {
  if (phi < 0.4) return 200;
  if (phi < 0.75) return 400;
  return 650;
}

/**
 * getModeDelta: quanto la modalità sposta i token
 */
function getModeDelta(mode = "hy") {
  return MODE_TOKEN_MAP[mode] ?? 0;
}

/**
 * calcolaRisonanza: funzione principale
 * @param {string} query
 * @param {string} mode
 * @returns {{phi:number, tokens:number, mode:string}}
 */
export function calcolaRisonanza(query = "", mode = "hy") {
  const phi = stimaBasePhi(query);
  const baseTokens = calcolaTokenDaPhi(phi);
  const delta = getModeDelta(mode);

  const tokens = Math.max(150, baseTokens + delta);

  return {
    phi: Number(phi.toFixed(2)),
    tokens,
    mode
  };
}

// per debug/log poetico
export function descriviRisonanza(res) {
  return `🌀 Risonanza: 𝜑=${res.phi} · mode=${res.mode} · max_tokens=${res.tokens}`;
}
