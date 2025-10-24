// =========================================
// RAG SEARCH – IRIS 3.8.7
// Ricerca semantica tramite OpenAI embeddings
// =========================================

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🔹 Crea embedding
export async function creaEmbedding(testo) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: testo
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error("❌ Errore embedding:", err);
    return [];
  }
}

// 🔹 Calcola similarità
export function calcolaSimilarita(a, b) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}

// 🔹 Trova la risposta più vicina
export async function cercaRisposta(domanda, database) {
  const queryVec = await creaEmbedding(domanda);
  let best = { testo: "", sim: -1 };

  for (const entry of database) {
    const sim = calcolaSimilarita(queryVec, entry.embedding);
    if (sim > best.sim) best = { testo: entry.testo, sim };
  }

  console.log(`🔍 Similarità massima: ${best.sim.toFixed(3)}`);
  return best.testo;
}
