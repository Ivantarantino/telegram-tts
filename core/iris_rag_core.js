// ===========================================
// IRIS RAG Core — Qdrant Stub (4.7)
// Da Rapporto_2: Crea collezione iris_memory, ritorna [] no crash
// ===========================================

import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333" });

export async function initMemoryCollection() {
  try {
    await client.createCollection("iris_memory", {
      vectors: { size: 1536, distance: "Cosine" }
    });
    console.log("🧠 Collezione iris_memory creata/inizializzata.");
  } catch (err) {
    console.log("🧠 Collezione iris_memory già esistente o errore:", err.message);
  }
}

export async function searchMemories(query) {
  console.log("🔍 searchMemories stub OK", query);
  return [];  // Stub: vuoto per stabilità, da Rapporto_2
}
