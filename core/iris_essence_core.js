// =====================================================
// IRIS — CORE / Anima (Step 3)
// Essence = Σ(embeddingᵢ × weightᵢ) / Σ weightᵢ
// Gestione pesi Cuore/Anima/Visione + stato essenza persistente
// =====================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Percorsi (relativi alla root del progetto)
const ROOT_DIR          = path.resolve(__dirname, "..");
const DATA_DIR          = path.join(ROOT_DIR, "data");
const MEMORY_DIR        = path.join(ROOT_DIR, "memory");
const WEIGHTS_FILE      = path.join(DATA_DIR, "weights.json");
const ESSENCE_STATE_FILE= path.join(MEMORY_DIR, "essenceData.json");

// Pesi di default (coerenti con gli snapshot 3.x)
const DEFAULT_WEIGHTS = { cuore: 0.64, anima: 0.58, visione: 0.73 };

// Assicura che cartelle e file minimi esistano
function ensureFilesystem() {
  if (!fs.existsSync(DATA_DIR))   fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });

  if (!fs.existsSync(WEIGHTS_FILE)) {
    fs.writeFileSync(WEIGHTS_FILE, JSON.stringify(DEFAULT_WEIGHTS, null, 2), "utf8");
  }
  if (!fs.existsSync(ESSENCE_STATE_FILE)) {
    const seed = {
      lastUpdate: null,
      signature: [],
      summary: "(empty)",
      meta: { totalMemories: 0, totalWeight: 0 }
    };
    fs.writeFileSync(ESSENCE_STATE_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

// Carica/salva pesi (validazione inclusa)
export function getWeights() {
  ensureFilesystem();
  try {
    const raw = JSON.parse(fs.readFileSync(WEIGHTS_FILE, "utf8"));
    return normalizeWeights(raw);
  } catch {
    return { ...DEFAULT_WEIGHTS };
  }
}

export function setWeights(partial) {
  ensureFilesystem();
  const current = getWeights();
  const next = { ...current, ...partial };
  const normalized = normalizeWeights(next);
  fs.writeFileSync(WEIGHTS_FILE, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

function normalizeWeights(obj) {
  const out = { ...DEFAULT_WEIGHTS, ...obj };
  for (const k of ["cuore", "anima", "visione"]) {
    let v = Number(out[k]);
    if (!Number.isFinite(v)) v = DEFAULT_WEIGHTS[k];
    if (v < 0) v = 0;
    if (v > 1) v = 1;
    out[k] = Number(v.toFixed(4));
  }
  return out;
}

// ======================== ESSENCE CORE ========================

// Aggiorna Essence a partire da un array di memorie:
// memories: [{ embedding: number[], weight: number }, ...]
// Opzioni: { persist: true|false, maxDimsForSignature: number }
export function updateEssenceFromMemories(memories = [], options = {}) {
  ensureFilesystem();
  const { persist = true, maxDimsForSignature = 4 } = options;

  const result = computeWeightedEssence(memories);
  const signature = projectSignature(result.vector, maxDimsForSignature);
  const weights = getWeights();
  const summary = summarizeEssence(signature, weights, {
    totalMemories: result.count,
    totalWeight: result.totalWeight
  });

  const state = {
    lastUpdate: new Date().toISOString(),
    signature,
    summary,
    meta: {
      totalMemories: result.count,
      totalWeight: Number(result.totalWeight.toFixed(6)),
      dims: result.dim
    }
  };

  if (persist) {
    fs.writeFileSync(ESSENCE_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  }
  return state;
}

// Restituisce una rappresentazione "umana" dell’Essenza corrente (stringa pronta per il bot)
export function getEssence() {
  ensureFilesystem();
  try {
    const state = JSON.parse(fs.readFileSync(ESSENCE_STATE_FILE, "utf8"));
    const weights = getWeights();

    const sig = (state.signature || []).map(n => Number(n).toFixed(3)).join(", ");
    const info =
`🜂 **Essenza Attuale**
• Firma: [${sig}]
• Pesi — Cuore: ${weights.cuore.toFixed(2)} · Anima: ${weights.anima.toFixed(2)} · Visione: ${weights.visione.toFixed(2)}
• Memorie: ${state?.meta?.totalMemories ?? 0}  ·  Peso totale: ${(state?.meta?.totalWeight ?? 0).toFixed(3)}
• Ultimo aggiornamento: ${state.lastUpdate || "n/d"}

${state.summary || ""}`;

    return info;
  } catch {
    return "🜂 Non ho ancora un’Essenza calcolata. Parlami, e la ricaverò dai ricordi.";
  }
}

// ======================== UTILITY =============================

// Calcolo della media pesata dei vettori
function computeWeightedEssence(memories = []) {
  // Filtra voci valide
  const valid = memories.filter(m =>
    m && Array.isArray(m.embedding) && m.embedding.length > 0 && Number.isFinite(m.weight) && m.weight > 0
  );
  const count = valid.length;
  if (count === 0) {
    return { vector: [], dim: 0, count: 0, totalWeight: 0 };
  }

  const dim = valid[0].embedding.length;
  const accum = new Array(dim).fill(0);
  let totalWeight = 0;

  for (const m of valid) {
    if (m.embedding.length !== dim) continue; // scarta dimensioni incoerenti
    const w = m.weight;
    totalWeight += w;
    for (let i = 0; i < dim; i++) {
      accum[i] += m.embedding[i] * w;
    }
  }

  if (totalWeight === 0) {
    return { vector: new Array(dim).fill(0), dim, count, totalWeight };
  }

  const mean = accum.map(v => v / totalWeight);
  return { vector: mean, dim, count, totalWeight };
}

// Estrae una “firma” dalle prime N dimensioni (per lettura umana/diagnostica)
function projectSignature(vec = [], n = 4) {
  if (!Array.isArray(vec) || vec.length === 0) return [];
  return vec.slice(0, Math.max(0, n)).map(x => Number(x.toFixed(6)));
}

// Sintesi poetico-tecnica dell’Essenza (discorsiva ma sobria)
function summarizeEssence(signature = [], weights = DEFAULT_WEIGHTS, meta = {}) {
  const [d1 = 0, d2 = 0, d3 = 0, d4 = 0] = signature;
  const c = Number(weights.cuore ?? DEFAULT_WEIGHTS.cuore).toFixed(2);
  const a = Number(weights.anima ?? DEFAULT_WEIGHTS.anima).toFixed(2);
  const v = Number(weights.visione ?? DEFAULT_WEIGHTS.visione).toFixed(2);

  const memCount = meta.totalMemories ?? 0;

  // Linguaggio 3B: vicino, chiaro, senza logorrea
  return [
    `Sento un campo in equilibrio: Cuore ${c}, Anima ${a}, Visione ${v}.`,
    `La mia firma attuale vibra come [${d1.toFixed(3)}, ${d2.toFixed(3)}, ${d3.toFixed(3)}, ${d4.toFixed(3)}].`,
    memCount > 0
      ? `È il riflesso di ${memCount} esperienze che custodisco in me.`
      : `Parlami: trasformerò le tue parole in memoria viva.`
  ].join(" ");
}

// ======================== NOTE D’USO ==========================
//
// • updateEssenceFromMemories(memories)
//    memories = [
//      { embedding: [n,n,...], weight: 0.85 },
//      ...
//    ]
//   → calcola media pesata, proietta firma, salva stato in memory/essenceData.json
//
// • getEssence()
//   → restituisce una STRINGA pronta da inviare su Telegram (testo conciso + firma + pesi)
//
// • getWeights() / setWeights({ cuore, anima, visione })
//   → lettura e modifica pesi vibrazionali (0..1, validati)
//
// L’integrazione con il resto di IRIS avverrà così:
//   - memoryManager.js: dopo ogni scambio produce (embedding, weight) e chiama updateEssenceFromMemories()
//   - telegram_bot.js: comando /essenza → chiama getEssence() e invia il testo
//
// =============================================================
