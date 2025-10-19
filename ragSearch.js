// ======================================
// 🧠 IRIS 2.0 — RAG Search Utility
// ======================================
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

// 🔍 Ricerca semantica su Qdrant
export async function answerWithRAG(query) {
  console.log("🔍 Ricerca:", query);

  // 1️⃣ Embedding della domanda
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const queryVector = embeddingResponse.data[0].embedding;

  // 2️⃣ Ricerca in Qdrant
  const searchResults = await qdrant.search(COLLECTION, {
    vector: queryVector,
    limit: 3,
  });

  const context = searchResults
    .map(hit => hit.payload.text)
    .join("\n\n---\n\n");

  // 3️⃣ Generazione della risposta con OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Rispondi in modo chiaro, sintetico e coerente con il contesto 
seguente.",
      },
      {
        role: "user",
        content: `Contesto:\n${context}\n\nDomanda:\n${query}`,
      },
    ],
  });

  const answer = completion.choices[0].message.content;
  console.log("✅ Risposta generata.");
  return answer;
}

