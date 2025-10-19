// ==========================================================
// ⚙️ qdrantInit.js – Inizializzazione automatica delle collection IRIS
// ==========================================================

import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

// ==========================================================
// 🧠 Funzione principale: initializeQdrant()
// ==========================================================
export async function initializeQdrant() {
  console.log("🔍 Controllo delle collection in Qdrant...");

  try {
    const collections = await qdrant.getCollections();
    const existing = collections.collections.map(c => c.name);

    // Se non esiste, crea la collection iris_memory
    if (!existing.includes("iris_memory")) {
      console.log("📚 Creazione collection 'iris_memory'...");
      await qdrant.createCollection("iris_memory", {
        vectors: { size: 3072, distance: "Cosine" }
      });
    } else {
      console.log("📚 Collection 'iris_memory' già esistente");
    }

    // Se non esiste, crea la collection iris_chat_history
    if (!existing.includes("iris_chat_history")) {
      console.log("💬 Creazione collection 'iris_chat_history'...");
      await qdrant.createCollection("iris_chat_history", {
        vectors: { size: 3072, distance: "Cosine" }
      });
    } else {
      console.log("💬 Collection 'iris_chat_history' già esistente");
    }

    console.log("✅ Tutte le collection sono pronte!");
  } catch (error) {
    console.error("❌ Errore durante l’inizializzazione di Qdrant:", error);
  }
}
