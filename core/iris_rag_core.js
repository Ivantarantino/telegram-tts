// =============================================================
// IRIS RAG CORE — Memoria Vettoriale (Qdrant Integration)
// =============================================================

import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

// -------------------------------------------------------------
// Inizializza client Qdrant
// -------------------------------------------------------------
const client = new QdrantClient({
  url: process.env.QDRANT_URL || "https://xxxxxxxx-qdrant-xxxxxxxx.upstash.io", // <--- metti la tua
  apiKey: process.env.QDRANT_API_KEY || "iris2_xxxxxxxxxxxxxxxxx",             // <--- metti la tua
});

// -------------------------------------------------------------
// Inizializza modello OpenAI per embedding
// -------------------------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -------------------------------------------------------------
// Funzione di embedding testuale
// -------------------------------------------------------------
export async function embedText(text) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return embedding.data[0].embedding;
}

// -------------------------------------------------------------
// Funzione: inserisce un nuovo ricordo nella memoria
// -------------------------------------------------------------
export async function storeMemory(id, text, metadata = {}) {
  const vector = await embedText(text);

  await client.upsert("iris_memory", {
    points: [
      {
        id,
        vector,
        payload: { text, ...metadata },
      },
    ],
  });

  console.log(`🧠 Ricordo salvato: ${id}`);
}

// -------------------------------------------------------------
// Funzione: ricerca nei ricordi esistenti
// -------------------------------------------------------------
export async function searchMemories(query, limit = 3) {
  const queryVector = await embedText(query);

  const results = await client.search("iris_memory", {
    vector: queryVector,
    limit,
    with_payload: true,
  });

  if (!results || results.length === 0) {
    return [];
  }

  const memories = results.map((r) => r.payload.text);
  console.log(`📚 ${memories.length} ricordi trovati.`);
  return memories;
}

// -------------------------------------------------------------
// Funzione: inizializza la collezione se non esiste
// -------------------------------------------------------------
export async function initMemoryCollection() {
  const collections = await client.getCollections();
  const exists = collections.collections.some(
    (c) => c.name === "iris_memory"
  );

  if (!exists) {
    await client.createCollection("iris_memory", {
      vectors: { size: 3072, distance: "Cosine" },
    });
    console.log("✨ Collezione iris_memory creata.");
  } else {
    console.log("🧠 Collezione iris_memory trovata.");
  }
}

// -------------------------------------------------------------
// Esegui inizializzazione all'avvio
// -------------------------------------------------------------
await initMemoryCollection();
