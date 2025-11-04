// =============================================================
// core/iris_rag_core.js
// IRIS 3.0G — ponte tra core e RAG (4.7 restore)
// =============================================================

import { QdrantClient } from "@qdrant/js-client-rest";
import { ragSearch } from "../adapters/ragSearch.js";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const BOOK_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";
const CHAT_COLLECTION = process.env.QDRANT_CHAT_COLLECTION || "iris_chat_history";

let qdrantClient = null;

export async function initMemoryCollection() {
  try {
    if (!QDRANT_URL || !QDRANT_API_KEY) {
      console.warn("⚠️ Qdrant non configurato — avvio in modalità senza memoria persistente.");
      return;
    }

    qdrantClient = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY
    });

    const existing = await qdrantClient.getCollections();
    const names = existing.collections.map((c) => c.name);

    if (!names.includes(BOOK_COLLECTION)) {
      console.log(`📚 Creo la collection libri: ${BOOK_COLLECTION}`);
      await qdrantClient.createCollection(BOOK_COLLECTION, {
        vectors: { size: 1536, distance: "Cosine" }
      });
    } else {
      console.log(`📚 Collection '${BOOK_COLLECTION}' già presente`);
    }

    if (!names.includes(CHAT_COLLECTION)) {
      console.log(`💬 Creo la collection chat: ${CHAT_COLLECTION}`);
      await qdrantClient.createCollection(CHAT_COLLECTION, {
        vectors: { size: 1536, distance: "Cosine" }
      });
    } else {
      console.log(`💬 Collection '${CHAT_COLLECTION}' già presente`);
    }

    console.log("🧠 Collezione iris_memory trovata.");
  } catch (err) {
    console.error("❌ Errore in initMemoryCollection:", err.message);
  }
}

export async function searchMemories(query) {
  return await ragSearch(query);
}
