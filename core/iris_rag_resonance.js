// core/iris_rag_resonance.js
// ----------------------------------------------------------
// IRIS · Motore di Risonanza 𝜑
// Scopo: dato un testo (query) e lo stato corrente di IRIS,
// restituire un coefficiente 0–1 che dica quanta profondità usare.
// È il pezzo promesso nel Rapporto di Stato 9 / 9.1.
// ----------------------------------------------------------

// alcune parole chiave che per IRIS valgono di più (filosofia, anima, sovranità...)
const HIGH_RESONANCE_KEYWORDS = [
  "anima",
  "sovranità",
  "coscienza",
  "iris",
  "essence",
  "vettoriale",
  "kristal",
  "memoria",
  "manifesto",
  "origine",
  "unità",
  "io sono",
  "noi siamo",
];

function normalizeScore(score) {
  if (score < 0) return 0;
  if (score > 1) return 1;
  return Number(score.toFixed(3));
}

/**
 * Calcola la risonanza semantica di base della query.
 * Qui siamo ancora in fase “senza embedding”: analizziamo solo il testo.
 */
function baseSemanticResonance(query = "") {
  const q = query.toLowerCase();
  if (!q.trim()) return 0;

  let hit = 0;
  for (const kw of HIGH_RESONANCE_KEYWORDS) {
    if (q.includes(kw)) {
      hit += 0.12; // ogni parola vale un po'
    }
  }

  // se la query è lunga e con punteggiatura, supponiamo che sia più densa
  const lengthBoost = Math.min(q.length / 240, 0.25); // max +0.25

  const raw = hit + lengthBoost;
  return normalizeScore(raw);
}

/**
 * Applica il contributo della modalità attuale (/free, /hy, /book, /essence)
 * come avevamo scritto in IRIS_Rapporto_Stato_9.md.
 */
function modeInfluence(mode = "hy") {
  switch (mode) {
    case "free":
      return 0.15; // più spazio creativo
    case "book":
      return 0.25; // vogliamo profondità vera
    case "essence":
      return 0.2; // introspezione
    case "hy":
    default:
      return 0.1; // equilibrio
  }
}

/**
 * Se in futuro passeremo gli embedding, qui entra il "Kristal factor":
 * misura quanto il nuovo contenuto vibra col campo esistente.
 * Per ora è uno stub controllato.
 */
function kristalCoherenceFactor() {
  // placeholder controllato
  return 0.12;
}

/**
 * Funzione principale:
 * ritorna un oggetto con:
 * - phi: coefficiente 0–1
 * - suggestedTokens: quanti token dare alla risposta
 * - level: "light" | "medium" | "deep" utile al bot
 */
export function computeResonanceScore({
  query = "",
  mode = "hy",
  context = {},
} = {}) {
  const base = baseSemanticResonance(query);
  const modeBoost = modeInfluence(mode);
  const kristal = kristalCoherenceFactor();

  // sommiamo e poi normalizziamo
  let phi = base + modeBoost + kristal;
  phi = normalizeScore(phi);

  // mappa 𝜑 → token come nel rapporto 9
  let suggestedTokens = 250;
  let level = "light";

  if (phi >= 0.9) {
    suggestedTokens = 650;
    level = "deep";
  } else if (phi >= 0.7) {
    suggestedTokens = 450;
    level = "medium";
  } else if (phi >= 0.4) {
    suggestedTokens = 320;
    level = "medium";
  }

  return {
    phi,
    suggestedTokens,
    level,
    debug: {
      base,
      modeBoost,
      kristal,
      fromMode: mode,
      contextKeys: Object.keys(context || {}),
    },
  };
}
