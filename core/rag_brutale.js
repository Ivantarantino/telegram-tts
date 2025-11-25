// core/rag_brutale.js – COMPLETO E FUNZIONANTE – 25.11.2025
import { QdrantClient } from "@qdrant/js-client-rest";
import { openai } from "../openai.js";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const DOCS_COLLECTION = "iris_docs";

export async function hybridSearch(query, recentMemory = [], limit = 5) {
  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const vector = embedding.data[0].embedding;

    const results = await qdrant.search(DOCS_COLLECTION, {
      vector,
      limit: limit + recentMemory.length,
      with_payload: true,
    });

    const docs = results
      .filter(r => r.score > 0.75)
      .map(r => r.payload.text)
      .join("\n\n");

    const recent = recentMemory
      .slice(-3)
      .map(m => `Utente: ${m.user}\nIRIS: ${m.iris}`)
      .join("\n\n");

    const text = [docs, recent].filter(Boolean).join("\n\n");

    return { text: text || "", score: results[0]?.score || 0 };
  } catch (e) {
    console.error("Errore RAG:", e.message);
    return { text: "", score: 0 };
  }
}

export async function ragSearch(query, limit = 8) {
  return hybridSearch(query, [], limit);
}
