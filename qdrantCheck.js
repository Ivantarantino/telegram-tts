// =======================================================
// 🧠 QdrantCheck — Test connessione e collezioni
// =======================================================
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🔌 Connessione a Qdrant...");
  const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });

  const collections = await client.getCollections();
  console.log("📚 Collezioni trovate:", collections.collections.map(c => c.name));

  console.log("✅ Test completato con successo!");
}

main().catch(err => console.error("❌ Errore Qdrant:", err));

