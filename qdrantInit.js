// qdrantInit.js – COMPLETO E FUNZIONANTE – 25.11.2025
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTIONS = [
  { name: "iris_memory", vectorSize: 1536 },
  { name: "iris_chat_history", vectorSize: 1536 },
  { name: "iris_docs", vectorSize: 1536 },
];

async function initCollections() {
  for (const col of COLLECTIONS) {
    try {
      const exists = await qdrant.hasCollection(col.name);
      if (!exists) {
        await qdrant.createCollection(col.name, {
          vectors: { size: col.vectorSize, distance: "Cosine" },
        });
        console.log(`📚 Collection '${col.name}' creata`);
      } else {
        console.log(`📚 Collection '${col.name}' già esistente`);
      }
    } catch (e) {
      console.error(`Errore con ${col.name}:`, e.message);
    }
  }
  console.log("✅ Tutte le collection sono pronte!");
}

initCollections();
