// core/iris_rag_core.js
// =====================================================
// IRIS 5.3 — Centrale RAG con Risonanza Dinamica
// Esporta tutte le funzioni che le vecchie build si aspettano
// =====================================================

import { QdrantClient } from "@qdrant/js-client-rest";
import { searchWithResonance } from "./iris_rag_resonance.js";
import { storeMemory } from "./iris_rag_store.js";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY || null,
});

const COLLECTION = "iris_memory";
const VECTOR_SIZE = 1536; // allineato alle build precedenti

// 🔹 alcune parti del progetto chiamano ancora questa in index.js
export async function initMemoryCollection() {
  try {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
    console.log("🧠 Collezione iris_memory creata/inizializzata.");
  } catch (err) {
    console.log("🧠 Collezione iris_memory già esistente o non accessibile:", err.message);
  }
}

// 🔹 vecchio nome usato da adapters/ragSearch.js
// ora semplicemente delega alla ricerca con risonanza
export async function searchMemories(query, limit = 8) {
  const ctx = await searchWithResonance(query, limit);
  return ctx;
}

// 🔹 nuovo nome “pulito” usato dal Cuore
export async function performRAG(query) {
  return await searchWithResonance(query, 8);
}

// 🔹 salvataggio ricordi (usato dal Cuore dopo la risposta)
export async function saveRAGMemory(user, input, reply) {
  try {
    await storeMemory(user, input, reply);
  } catch (err) {
    console.error("⚠️ Errore salvataggio memoria:", err.message);
  }
}
