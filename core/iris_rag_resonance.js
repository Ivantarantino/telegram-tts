// core/iris_rag_resonance.js
// =====================================================
// IRIS 5.3.2 — Risonanza Dinamica (fix incrementCallCount)
// =====================================================

import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY || null,
});

const COLLECTION = "iris_memory";
const EMBED_MODEL = "text-embedding-3-small";

// 🔹 Crea embedding sicuro
async function embed(text) {
  const clean = (text || "").toString().slice(0, 4000);
  const res = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: clean,
  });
  return res.data[0].embedding;
}

// 🔹 Calcola il punteggio di risonanza (affinità × recenza × frequenza)
function computeResonanceScore(point, similarity) {
  try {
    const now = Date.now();
    const t = new Date(point.payload?.timestamp || now).getTime();
    const ageHours = Math.max(0, (now - t) / 3600000);
    const recency = Math.exp(-ageHours / 72); // decadimento 3 giorni
    const freq = Math.max(1, point.payload?.calls || 1) / 3;
    const resonance = Number(similarity) * recency * freq;
    return isNaN(resonance) ? 0 : resonance;
  } catch {
    return 0;
  }
}

// 🔹 Aggiorna la frequenza (solo se punto valido)
async function incrementCallCount(point) {
  try {
    if (!point || !point.id) return;
    const currentCalls = point.payload?.calls ?? 0;
    const updatedCalls = Math.max(0, currentCalls + 1);
    await qdrant.setPayload({
      collection_name: COLLECTION,
      points: [
        {
          id: point.id,
          payload: { ...(point.payload || {}), calls: updatedCalls },
        },
      ],
    });
  } catch (err) {
    console.log("⚠️ Errore aggiornamento frequenza:", err.message);
  }
}

// 🔍 Ricerca vettoriale con pesi di risonanza
export async function searchWithResonance(query, limit = 8) {
  try {
    const vector = await embed(query);
    const results = await qdrant.search(COLLECTION, {
      vector,
      limit,
      with_payload: true,
      score_threshold: 0.3,
    });

    if (!results || results.length === 0) return "Nessun ricordo.";

    const scored = results
      .filter((r) => r && r.payload)
      .map((r) => ({
        ...r,
        resonance: computeResonanceScore(r, r.score),
      }))
      .sort((a, b) => b.resonance - a.resonance);

    // aggiorna solo i primi 3 (validi)
    for (const p of scored.slice(0, 3)) {
      if (p?.id) incrementCallCount(p);
    }

    const context = scored
      .slice(0, 4)
      .map((p) => `🔹 ${p.payload?.reply || "(vuoto)"}`)
      .join("\n");

    console.log(
      `📚 RAG — ${scored.length} elementi (ponderati: ${scored
        .slice(0, 4)
        .map((p) => p.resonance.toFixed(2))
        .join(", ")})`
    );

    return context;
  } catch (err) {
    console.error("❌ Errore Risonanza Dinamica:", err.message);
    return "Nessun ricordo.";
  }
}
