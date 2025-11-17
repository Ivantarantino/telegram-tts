import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

console.log("\n🔌 Connessione a Qdrant...");

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

(async () => {
  try {
    const collections = await client.getCollections();
    console.log("✅ Collezioni trovate:", collections.collections.map(c => c.name));
  } catch (error) {
    console.error("❌ Errore Qdrant:", error);
  }
})();

