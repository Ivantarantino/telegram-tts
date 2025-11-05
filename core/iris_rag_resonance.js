// core/iris_rag_resonance.js
// =====================================================
// IRIS 5.3 — Coscienza Vettoriale · Risonanza Dinamica
// Ogni ricordo vibra: risonanza (affinità), recenza, frequenza
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

// Calcola embedding testuale
async function embed(text) {
  const clean = (text || "").toString().slice(0, 4000);
  const res = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: clean,
  });
  return res.data[0].embedding;
}

// Calcola punteggio di risonanza (affinità * recenza * frequenza)
function computeResonanceScore(point, similarity) {
  const now = Date.now();
  const t = new Date(point.payload.timestamp).getTime();
  const ageHours = (now - t) / 3600000;

  // Recenza: ricordi recenti pesano di più
  const recency = Math.exp(-ageHours / 72); // 3 giorni di semi-decadimento

  // Frequenza: quante volte è stato richiamato
  const freq = (point.payload.calls || 1) / 3; // normalizza

  // Risonanza finale (similitudine * recenza * frequenza)
  return similarity * recency * freq;
}

// Incrementa il contatore di frequenza di un ricordo
async function incrementCallCount(pointId) {
  try {
    await qdrant.setPayload(COLLECTION, {
      points: [pointId],
      payload: { calls: (pointId.payload?.calls || 0) + 1 },
    });
  } catch (err) {
    console.log("⚠️ Errore aggiornamento frequenza:", err.message);
  }
}

// 🔍 Ricerca con risonanza dinamica
export async function searchWithResonance(query, limit = 8) {
  try {
    const vector = await embed(query);

    const res = await qdrant.search(COLLECTION, {
      vector,
      limit,
      with_payload: true,
      score_threshold: 0.3,
    });

    if (!res || res.length === 0) return "Nessun ricordo.";

    // Calcola il punteggio pesato per ogni punto
    const scored = res.map((p) => ({
      ...p,
      resonance: computeResonanceScore(p, p.score),
    }));

    // Ordina per risonanza decrescente
    scored.sort((a, b) => b.resonance - a.resonance);

    // Aggiorna contatore frequenza
    for (const p of scored.slice(0, 3)) incrementCallCount(p);

    // Ritorna testo combinato
    const context = scored
      .slice(0, 4)
      .map((p) => `🔹 ${p.payload.reply}`)
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
