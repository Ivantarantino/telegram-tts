// =======================================================
// 🧠 qdrantCheck.js – Diagnostica Qdrant
// =======================================================
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";
dotenv.config();

const client = new QdrantClient({
  url: process.env.QDRANT_URL, // esempio: https://xxxxx.eu-central.aws.cloud.qdrant.io
  apiKey: process.env.QDRANT_API_KEY
});

async function checkQdrant() {
  console.log("🔍 Connessione a Qdrant...");
  const collections = await client.getCollections();
  console.log("📚 Collezioni disponibili:", collections.collections.map(c => c.name));

  const name = "iris_memory";
  console.log(`\n📦 Verifico collezione: ${name}`);
  try {
    const info = await client.getCollection(name);
    console.log("✅ Info collection:", info);
  } catch (err) {
    console.error("❌ Errore nella lettura della collezione:", err.message);
  }

  console.log("\n🔢 Conto punti inseriti...");
  try {
    const count = await client.count(name);
    console.log("📊 Totale punti nella collezione:", count);
  } catch (err) {
    console.error("❌ Errore nel conteggio:", err.message);
  }
}

checkQdrant();
