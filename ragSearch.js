// === ragSearch.js ===
// Funzione di ricerca semantica su Qdrant
// IRIS utilizza questo per recuperare contesto dai libri 📚

import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

export async function ragSearch(query) {
  if (!query) return [];

  try {
    const embedding = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input: query,
        model: "text-embedding-3-small",
      }),
    }).then((r) => r.json());

    const vector = embedding.data[0].embedding;

    const search = await client.search("iris_docs", {
      vector,
      limit: 3,
      with_payload: true,
    });

    return search.map((hit) => hit.payload);
  } catch (err) {
    console.error("❌ Errore in ragSearch:", err);
    return [];
  }
}
