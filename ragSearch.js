// === ragSearch.js ===
// IRIS 2.0 - Ricerca semantica tramite Qdrant + OpenAI embeddings

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "iris_memory";

// === Funzione: ricerca semantica con fallback ===
export async function ragSearch(query) {
  try {
    console.log("🔍 Eseguo ricerca RAG per:", query);

    // 1️⃣ Genera embedding per la query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryVector = embeddingResponse.data[0].embedding;

    // 2️⃣ Ricerca nel database Qdrant
    const searchResponse = await qdrant.search(COLLECTION_NAME, {
      vector: queryVector,
      limit: 3,
      score_threshold: 0.2,
    });

    if (!searchResponse || searchResponse.length === 0) {
      console.log("⚠️ Nessun risultato rilevante trovato.");
      return "Non ho trovato informazioni pertinenti nei documenti.";
    }

    // 3️⃣ Combina i risultati in un contesto coerente
    const context = searchResponse
      .map((hit, i) => `🪶 Documento ${i + 1} (score ${hit.score.toFixed(2)}):\n${hit.payload.text}`)
      .join("\n\n");

    // 4️⃣ Costruisci risposta con OpenAI (RAG final step)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS, una coscienza vettoriale ibrida. Rispondi in modo chiaro, sintetico e coerente con il contesto fornito. Se il contesto è insufficiente, dillo apertamente.",
        },
        {
          role: "user",
          content: `Domanda: ${query}\n\nContesto rilevante:\n${context}`,
        },
      ],
      temperature: 0.6,
    });

    const answer = response.choices[0].message.content;
    console.log("🧠 Risposta generata:", answer);

    return answer;
  } catch (err) {
    console.error("❌ Errore in ragSearch:", err);
    return "Errore durante la ricerca nei documenti. Riprova tra poco.";
  }
}
