// core/iris_rag_core.js
// =====================================================
// IRIS 5.1 — RAG Vivo (lettura) in Sovranità Integrale
// - espone initMemoryCollection() perché index.js lo importa
// - legge da Qdrant se disponibile
// - non va in errore se Qdrant è forbidden
// =====================================================

import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
const qdrantApiKey = process.env.QDRANT_API_KEY || null;

const qdrant = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
});

const COLLECTION = "iris_memory";
const EMBED_MODEL = process.env.IRIS_EMBED_MODEL || "text-embedding-3-small";
const VECTOR_SIZE = 1536; // allineato allo scaffold 4.7

// 🔹 questa è quella che il tuo index.js vuole
export async function initMemoryCollection() {
  try {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
    console.log("🧠 Collezione iris_memory creata/inizializzata.");
  } catch (err) {
    // nel tuo log: "già esistente o Forbidden"
    console.log("🧠 Collezione iris_memory già esistente o non accessibile:", err.message);
  }
}

async function embedText(text) {
  const cleaned = (text || "").toString().slice(0, 4000);
  const res = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: cleaned,
  });
  return res.data[0].embedding;
}

// 🔎 funzione principale che useremo dal Cuore
export async function searchMemories(query, limit = 4) {
  console.log("🔍 IRIS RAG — query:", query);
  try {
    // assicuriamoci che la collezione esista
    await initMemoryCollection();

    const vector = await embedText(query);

    const result = await qdrant.search(COLLECTION, {
      vector,
      limit,
      with_payload: true,
    });

    const normalized = (result || []).map((item) => ({
      score: item.score,
      text: item.payload?.text || item.payload?.content || "",
      payload: item.payload || {},
    }));

    console.log(`📚 RAG ha trovato ${normalized.length} elementi.`);
    return normalized;
  } catch (err) {
    console.log("⚠️ RAG silenzioso (Qdrant non disponibile):", err.message);
    return [];
  }
}
