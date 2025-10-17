// testQdrant.js
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";
dotenv.config();

const { QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION } = process.env;

async function testConnection() {
  try {
    console.log("🔌 Connessione a Qdrant...");
    const client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });

    const info = await client.getCollections();
    console.log("✅ Connessione riuscita!");
    console.log("📚 Collezioni disponibili:", info.collections);

    // prova a creare la collezione se non esiste
    if (!info.collections.some(c => c.name === QDRANT_COLLECTION)) {
      console.log(`ℹ️ Creo la collection: ${QDRANT_COLLECTION}`);
      await client.createCollection(QDRANT_COLLECTION, {
        vectors: { size: 1536, distance: "Cosine" },
      });
      console.log("✅ Collection creata con successo!");
    } else {
      console.log("✅ Collection già presente!");
    }

    console.log("🚀 Test completato con successo");
  } catch (err) {
    console.error("❌ Errore di connessione:", err.message);
  }
}

testConnection();
