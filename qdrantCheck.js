// ======================================
// 🧪 IRIS — Test connessione Qdrant
// ======================================
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";
dotenv.config();

async function testQdrant() {
  console.log("🔌 Connessione a Qdrant...");

  try {
    const client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });

    const collections = await client.getCollections();
    const names = collections.collections.map((c) => c.name);
    console.log("📚 Collezioni trovate:", names);

    if (names.includes(process.env.QDRANT_COLLECTION)) {
      console.log("✅ Test completato con successo!");
    } else {
      console.log(`⚠️ Collezione "${process.env.QDRANT_COLLECTION}" non trovata!`);
    }
  } catch (err) {
    console.error("❌ Errore di connessione Qdrant:", err.message);
  }
}

testQdrant();
