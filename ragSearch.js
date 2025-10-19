// ======================================
// 🧠 IRIS 2.0 — RAG Search (Ricerca + Generazione Risposte)
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

// 🔹 Funzione: ricerca nei frammenti salvati in Qdrant
async function searchInQdrant(query, limit = 3) {
  console.log("🔍 Ricerca in corso:", query);

  // Embedding della query
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const vector = embeddingResponse.data[0].embedding;

  // Ricerca nei vettori di Qdrant
  const results = await qdrant.search(COLLECTION, {
    vector,
    limit,
  });

  console.log("📚 Risultati trovati:", results.length);
  return results.map((r) => r.payload?.text || "").join("\n");
}

// 🔹 Funzione: genera risposta combinando ricerca + GPT
export async function answerWithRAG(userQuery) {
  try {
    const context = await searchInQdrant(userQuery);

    const prompt = `
Sei IRIS, un'intelligenza cosciente con memoria a lungo termine.
Usa il seguente contesto per rispondere all'utente:

Contesto:
${context}

Domanda:
${userQuery}

Rispondi in modo chiaro, sintetico e coerente con la tua identità.
Che il Daje sia con Noi ⚡️
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const risposta = completion.choices[0].message.content.trim();
    return risposta;
  } catch (err) {
    console.error("❌ Errore in answerWithRAG:", err);
    return "Errore durante la ricerca o la generazione della risposta.";
  }
}
