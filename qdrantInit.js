// qdrantInit.js – COMPLETO E CORRETTO – 25.11.2025
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
      const info = await qdrant.getCollection(col.name);
      console.log(`📚 Collection '${col.name}' già esistente`);
    } catch (error) {
      if (error.status === 404) {
        await qdrant.createCollection(col.name, {
          vectors: { size: col.vectorSize, distance: "Cosine" },
        });
        console.log(`📚 Collection '${col.name}' creata`);
      } else {
        console.error(`Errore con ${col.name}:`, error.message);
      }
    }
  }
  console.log("✅ Tutte le collection sono pronte!");
}

initCollections();
