// =============================
// 📦 ragClient.js – Qdrant + Embeddings OpenAI
// =============================
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

const {
  QDRANT_URL,
  QDRANT_API_KEY,
  QDRANT_COLLECTION = "iris_memory",
  OPENAI_API_KEY
} = process.env;

if (!QDRANT_URL || !QDRANT_API_KEY) {
  console.error("❌ QDRANT_URL / QDRANT_API_KEY mancanti");
}
if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY mancante");
}

const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Modello embedding → 1536 dimensioni
const EMBEDDING_MODEL = "text-embedding-3-small";
const VECTOR_SIZE = 1536;

export async function ensureCollection() {
  try {
    await qdrant.getCollection(QDRANT_COLLECTION);
    console.log(`✅ Collection esistente: ${QDRANT_COLLECTION}`);
  } catch {
    console.log(`ℹ️ Creo collection: ${QDRANT_COLLECTION}`);
    await qdrant.createCollection(QDRANT_COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
    console.log(`✅ Collection creata: ${QDRANT_COLLECTION}`);
  }
}

export async function embedText(text) {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

// Inserisce o aggiorna documenti [{id?, text, meta?}]
export async function upsertDocuments(docs = []) {
  if (!docs.length) return 0;
  const points = [];
  for (const doc of docs) {
    const vector = await embedText(doc.text);
    points.push({
      id: doc.id ?? undefined,
      vector,
      payload: {
        text: doc.text,
        meta: doc.meta || {},
      },
    });
  }
  await qdrant.upsert(QDRANT_COLLECTION, { points });
  return points.length;
}

export async function semanticSearch(query, { limit = 5 } = {}) {
  const vector = await embedText(query);
  const out = await qdrant.search(QDRANT_COLLECTION, {
    vector,
    limit,
    with_payload: true,
    with_vectors: false,
  });
  return out.map((r) => ({
    score: r.score,
    text: r.payload?.text || "",
    meta: r.payload?.meta || {},
  }));
}
