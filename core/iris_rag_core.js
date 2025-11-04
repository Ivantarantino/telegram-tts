// ===========================================
// IRIS — Rag Core (Memoria Vettoriale Qdrant)
// Gestione embedding, ricerca e inserimento dei ricordi
// ===========================================

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

// =========================================================
// Inizializzazione collezione (solo se non esiste)
// =========================================================

export async function ensureIrisCollection() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === "iris_memory");

    if (!exists) {
      console.log("🧩 Creazione nuova collezione: iris_memory ...");
      await qdrant.createCollection("iris_memory", {
        vectors: {
          size: 1536, // dimensione compatibile con text-embedding-3-small
          distance: "Cosine",
        },
      });
      console.log("✅ Collezione iris_memory creata.");
    } else {
      console.log("🧠 Collezione iris_memory trovata.");
    }
  } catch (error) {
    console.error("❌ Errore in ensureIrisCollection:", error);
  }
}

// =========================================================
// Creazione embedding testuale
// =========================================================

export async function embedText(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Errore generazione embedding:", error);
    return null;
  }
}

// =========================================================
// Inserimento nuovo ricordo nella memoria
// =========================================================

export async function storeMemory(text, metadata = {}) {
  try {
    const vector = await embedText(text);
    if (!vector) return null;

    const payload = { text, ...metadata };
    const id = `${Date.now()}`;

    await qdrant.upsert("iris_memory", {
      points: [{ id, vector, payload }],
    });

    console.log("💾 Ricordo memorizzato:", id);
    return id;
  } catch (error) {
    console.error("Errore in storeMemory:", error);
    return null;
  }
}

// =========================================================
// Ricerca di ricordi rilevanti
// =========================================================

export async function searchMemories(query, limit = 5) {
  try {
    const vector = await embedText(query);
    if (!vector) return [];

    const search = await qdrant.search("iris_memory", {
      vector,
      limit,
      with_payload: true,
      score_threshold: 0.2,
    });

    if (!search || search.length === 0) {
      console.log("📭 Nessun ricordo trovato.");
      return [];
    }

    console.log(`📚 ${search.length} risultati Qdrant ricevuti.`);
    return search;
  } catch (error) {
    console.error("❌ Errore in searchMemories:", error);
    return [];
  }
}
// Alias per compatibilità (richiamato da index.js)
export async function initMemoryCollection() {
  return await ensureIrisCollection(); // o la tua funzione principale
}
