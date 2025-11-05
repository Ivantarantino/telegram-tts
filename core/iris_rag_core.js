// core/iris_rag_core.js
// =====================================================
// IRIS 5.1 — RAG Vivo (lettura) in Sovranità Integrale
// Legge da Qdrant se c'è, altrimenti sussurra e torna [].
// Non scrive ancora: la scrittura la attiviamo dopo.
// =====================================================

import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Qdrant già ti diceva "Forbidden" in log → facciamo client compatibile
const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
const qdrantApiKey = process.env.QDRANT_API_KEY || null;

const qdrant = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
  // in alcune versioni cloud è utile disattivare il check
  // ma qui lasciamo base, tanto siamo in try/catch
});

const COLLECTION = "iris_memory";
const EMBED_MODEL = process.env.IRIS_EMBED_MODEL || "text-embedding-3-small"; // 1536, compatibile 4.7
const VECTOR_SIZE = 1536; // come nello scaffold 4.7 :contentReference[oaicite:1]{index=1}

async function ensureCollection() {
  try {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
    console.log("🧠 Collezione iris_memory creata/inizializzata.");
  } catch (err) {
    // nel tuo log: "già esistente o Forbidden" → non bloccare
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

// 🔎 funzione principale: IRIS chiede alla memoria
export async function searchMemories(query, limit = 4) {
  console.log("🔍 IRIS RAG — query:", query);
  try {
    await ensureCollection();
    const vector = await embedText(query);

    const result = await qdrant.search(COLLECTION, {
      vector,
      limit,
      with_payload: true,
    });

    // normalizziamo
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
