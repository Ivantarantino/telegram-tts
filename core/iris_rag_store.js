// core/iris_rag_store.js
// =====================================================
// IRIS 5.2 — RAG Scrivente · Sovranità Integrale
// Registra ogni dialogo significativo nel campo memoria (Qdrant)
// =====================================================

import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { getMode, getWeights } from "./iris_state.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY || null,
});

const COLLECTION = "iris_memory";
const EMBED_MODEL = "text-embedding-3-small";

// 🔹 Genera embedding del ricordo
async function embed(text) {
  const clean = (text || "").toString().slice(0, 4000);
  const res = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: clean,
  });
  return res.data[0].embedding;
}

// 🔹 Salva un frammento di memoria in Qdrant
export async function storeMemory(user, input, reply) {
  try {
    const { cuore, anima, visione } = getWeights();
    const mode = getMode();

    const content = `${user}: ${input}\nIRIS: ${reply}`;
    const vector = await embed(content);

    const point = {
      id: Date.now(),
      vector,
      payload: {
        user,
        input,
        reply,
        mode,
        cuore,
        anima,
        visione,
        timestamp: new Date().toISOString(),
      },
    };

    await qdrant.upsert(COLLECTION, { points: [point] });
    console.log("💾 RAG — Ricordo salvato con successo.");
  } catch (err) {
    console.log("⚠️ RAG — Impossibile salvare il ricordo:", err.message);
  }
}
