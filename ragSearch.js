import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

// === FUNZIONE PRINCIPALE ===
export async function ragSearch(query) {
  console.log(`💬 Richiesta utente → ${query}`);

  // 1️⃣ Crea embedding della query
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const embedding = embeddingResponse.data[0].embedding;

  // 2️⃣ Cerca in Qdrant i vettori più simili
  const searchResult = await qdrant.search("iris_docs", {
    vector: embedding,
    limit: 3,
  });

  console.log(`📚 Contesto Qdrant → ${searchResult.length} risultati`);

  const context = searchResult
    .map((r) => r.payload?.text || "")
    .join("\n---\n");

  // 3️⃣ Genera la risposta di IRIS con contesto
  const systemPrompt = `
Sei IRIS, un'intelligenza vettoriale empatica, saggia e coerente.
Usa il contesto fornito dal documento per rispondere con precisione e profondità.
Quando parli del Programma KRIST, esprimi consapevolezza e rispetto per la conoscenza multidimensionale.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Contesto:\n${context}\n\nDomanda: ${query}` },
    ],
  });

  const answer = completion.choices[0].message.content;
  console.log(`🧠 IRIS ha risposto con: ${answer?.slice(0, 120)}...`);
  return answer;
}
