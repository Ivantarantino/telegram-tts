// =============================================================
// core/iris_rag_core.js
// IRIS 3.0G — RAG & Memoria Vettoriale (milestone 4.8)
// -------------------------------------------------------------
// Espone SOLO ciò che index.js e i bot devono chiamare:
// - initMemoryCollection()
// - searchMemories(query)
// Internamente riusa la stessa logica di ragSearch.js (adapters)
// così non duplichiamo il motore.
// =============================================================

import { QdrantClient } from "@qdrant/js-client-rest";
import { ragSearch } from "../adapters/ragSearch.js";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const BOOK_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";
const CHAT_COLLECTION = process.env.QDRANT_CHAT_COLLECTION || "iris_chat_history";

let qdrantClient = null;

// -------------------------------------------------------------
// Inizializza le collection necessarie (libri + chat)
// -------------------------------------------------------------
export async function initMemoryCollection() {
  try {
    if (!QDRANT_URL || !QDRANT_API_KEY) {
      console.warn("⚠️ Qdrant non configurato (URL o API key mancante). Procedo in modalità fallback.");
      return;
    }

    qdrantClient = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY
    });

    const existing = await qdrantClient.getCollections();
    const names = existing.collections.map((c) => c.name);

    // libri / documenti
    if (!names.includes(BOOK_COLLECTION)) {
      console.log(`📚 Creo la collection libri: ${BOOK_COLLECTION}`);
      await qdrantClient.createCollection(BOOK_COLLECTION, {
        vectors: { size: 1536, distance: "Cosine" }
      });
    } else {
      console.log(`📚 Collection '${BOOK_COLLECTION}' già presente`);
    }

    // chat / memoria conversazionale
    if (!names.includes(CHAT_COLLECTION)) {
      console.log(`💬 Creo la collection chat: ${CHAT_COLLECTION}`);
      await qdrantClient.createCollection(CHAT_COLLECTION, {
        vectors: { size: 1536, distance: "Cosine" }
      });
    } else {
      console.log(`💬 Collection '${CHAT_COLLECTION}' già presente`);
    }

    console.log("🧠 Collezioni Qdrant pronte (RAG attivabile).");
  } catch (err) {
    console.error("❌ Errore in initMemoryCollection:", err.message);
  }
}

// -------------------------------------------------------------
// Ricerca di memoria (usata dal bot o dal core Cuore+Mente)
// -------------------------------------------------------------
export async function searchMemories(query) {
  try {
    // Deleghiamo al motore già presente in adapters/ragSearch.js
    const answer = await ragSearch(query);
    return typeof answer === "string" ? answer : JSON.stringify(answer);
  } catch (err) {
    console.error("❌ Errore in searchMemories:", err.message);
    return "⚙️ Non riesco a consultare la mia memoria in questo momento.";
  }
}
