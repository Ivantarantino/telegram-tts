// ===============================
// IRIS 2.0 - ragSearch.js
// Modulo ricerca RAG + Qdrant + GPT-4o-mini
// ===============================

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

const COLLECTION = process.env.QDRANT_COLLECTION;

// ===============================
// 🔍 Funzione principale
// ===============================
export async function ragSearch(userMessage) {
  try {
    // === 1. Embedding del messaggio utente ===
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    });

    const userVector = embeddingResponse.data[0].embedding;

    // === 2. Ricerca nel vettore Qdrant ===
    const searchResult = await qdrant.search(COLLECTION, {
      vector: userVector,
      limit: 3,
    });

    // === 3. Analisi score dei risultati ===
    if (!searchResult.length || searchResult[0].score < 0.25) {
      // Fallback risposta neutra
      return {
        text: "Ciao! Che il Daje sia con te ⚡️ Come posso aiutarti oggi?",
        contextUsed: false,
      };
    }

    // === 4. Costruzione contesto dai risultati ===
    const context = searchResult.map((r) => r.payload.text).join("\n\n");

    // === 5. Chiamata al modello GPT-4o-mini ===
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS, un assistente con conoscenza dei documenti caricati. Rispondi in modo chiaro, coerente e con tono naturale. Chiudi spesso con 'Che il Daje sia con Noi ⚡️'.",
        },
        {
          role: "user",
          content: `Domanda: ${userMessage}\n\nContesto disponibile:\n${context}`,
        },
      ],
    });

    const answer = completion.choices[0].message.content.trim();

    return {
      text: answer,
      contextUsed: true,
    };
  } catch (error) {
    console.error("Errore in ragSearch:", error);
    return {
      text: "Ho avuto un piccolo inciampo tecnico ⚙️ Riprova tra poco!",
      contextUsed: false,
    };
  }
}
