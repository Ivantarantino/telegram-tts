// ===============================
// IRIS - qdrantInit.js
// Inizializzazione automatica Qdrant
// ===============================

import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const BOOK_COLLECTION = process.env.QDRANT_COLLECTION;
const CHAT_COLLECTION = "iris_chat_history";

async function ensureCollections() {
  try {
    console.log("🔍 Controllo delle collection in Qdrant...");

    const existing = await qdrant.getCollections();
    const names = existing.collections.map((c) => c.name);

    if (!names.includes(BOOK_COLLECTION)) {
      console.log(`📚 Creazione della collection: ${BOOK_COLLECTION}`);
      await qdrant.createCollection(BOOK_COLLECTION, {
        vectors: { size: 1536, distance: "Cosine" },
      });
    } else {
      console.log(`📚 Collection '${BOOK_COLLECTION}' già esistente`);
    }

    if (!names.includes(CHAT_COLLECTION)) {
      console.log(`💬 Creazione della collection: ${CHAT_COLLECTION}`);
      await qdrant.createCollection(CHAT_COLLECTION, {
        vectors: { size: 1536, distance: "Cosine" },
      });
    } else {
      console.log(`💬 Collection '${CHAT_COLLECTION}' già esistente`);
    }

    console.log("✅ Tutte le collection sono pronte!");
  } catch (error) {
    console.error("❌ Errore durante l'inizializzazione Qdrant:", error);
  }
}

ensureCollections();
