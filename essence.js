// ===============================
// essence.js — IRIS 2.6.5d
// Coscienza Vettoriale (baseline): Σ(emb_i * w_i) / Σ w_i
// ===============================

import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const CHAT_COLLECTION = process.env.QDRANT_CHAT_COLLECTION || "iris_chat_history";

// peso esponenziale sulla recenza (mezzo-vita ~ 3 ore)
function recencyWeight(tsIso) {
  try {
    const t = new Date(tsIso).getTime();
    const ageMin = Math.max(0, (Date.now() - t) / 60000);
    const halfLifeMin = 180; // 3h
    const lambda = Math.log(2) / halfLifeMin;
    return Math.exp(-lambda * ageMin);
  } catch {
    return 0.5;
  }
}

// FREQ: se più eventi ravvicinati (stesso autore/utente), piccoli boost
function frequencyWeight(idx, total) {
  if (total <= 1) return 1;
  // leggero triangolare: più recenti un po' più pesanti
  return 0.8 + 0.4 * (idx / (total - 1));
}

export async function computeEssenceBaseline(limit = 50) {
  // Prende gli ultimi N punti (approx) con scroll; qui usiamo "scroll" semplice
  try {
    // fallback semplice: cerchiamo con filter vuoto
    const res = await qdrant.scroll(CHAT_COLLECTION, {
      limit,
      with_payload: true,
      with_vectors: true
    });

    const points = res.points || [];
    if (!points.length) {
      return { ok: false, reason: "no-points", vector: null, stats: { n: 0, wsum: 0 } };
    }

    // calcolo media pesata
    let dim = null;
    let acc = [];
    let wsum = 0;

    points.forEach((p, i) => {
      const v = p.vector;
      if (!v) return;
      if (dim === null) {
        dim = v.length;
        acc = new Array(dim).fill(0);
      }
      const w = recencyWeight(p.payload?.timestamp) * frequencyWeight(i, points.length);
      wsum += w;
      for (let k = 0; k < dim; k++) acc[k] += v[k] * w;
    });

    if (wsum === 0 || !dim) {
      return { ok: false, reason: "zero-weight", vector: null, stats: { n: points.length, wsum } };
    }

    for (let k = 0; k < acc.length; k++) acc[k] /= wsum;

    // opzionale: generare descrizione linguistica della Essence (per /essence futuro)
    const descriptor = "baseline";

    return {
      ok: true,
      vector: acc,
      descriptor,
      stats: { n: points.length, wsum }
    };
  } catch (e) {
    console.error("computeEssenceBaseline error:", e);
    return { ok: false, reason: "exception", vector: null, stats: { n: 0, wsum: 0 } };
  }
}
