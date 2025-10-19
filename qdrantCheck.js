import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

async function checkQdrant() {
  try {
    console.log("🔌 Connessione a Qdrant...");
    const collections = await client.getCollections();
    console.log("📚 Collezioni trovate:", collections.collections.map(c => c.name));
    console.log("✅ Test completato con successo!");
  } catch (err) {
    console.error("❌ Errore durante la connessione:", err);
  }
}

checkQdrant();
