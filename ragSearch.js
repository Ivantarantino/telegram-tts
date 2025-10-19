// ===============================
// IRIS 2.1 - ragSearch.js
// RAG + GPT-4o-mini + Qdrant
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
// 🔍 RAG SEARCH (Book Mode)
// ===============================
export async function ragSearch(userMessage) {
  try {
    // === 1. Genera embedding per il messaggio utente ===
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    });

    const userVector = embeddingResponse.data[0].embedding;

    // === 2. Ricerca nel database Qdrant ===
    const searchResult = await qdrant.search(COLLECTION, {
      vector: userVector,
      limit: 3,
    });

    // === 3. Se nessun risultato rilevante, fallback neutro ===
    if (!searchResult.length || searchResult[0].score < 0.25) {
      return {
        text: "Ciao! Che il Daje sia con te ⚡️ Come posso aiutarti oggi?",
        contextUsed: false,
      };
    }

    // === 4. Costruisce il contesto dai risultati trovati ===
    const context = searchResult.map((r) => r.payload.text).join("\n\n");

    // === 5. Chiamata GPT-4o-mini con contesto (Book Mode) ===
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS in modalità BOOK MODE. Rispondi solo usando le informazioni provenienti dai documenti caricati, con tono chiaro e naturale. Chiudi spesso con 'Che il Daje sia con Noi ⚡️'.",
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

// ===============================
// 🧠 GPT FREE MODE
// ===============================
export async function gptFreeResponse(userMessage) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS in modalità FREE MODE. Rispondi liberamente, in modo naturale, intelligente e coerente, mantenendo il tuo stile unico. Chiudi spesso con 'Che il Daje sia con Noi ⚡️'.",
        },
        { role: "user", content: userMessage },
      ],
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("Errore in gptFreeResponse:", error);
    return "⚙️ C’è stato un piccolo problema. Riprova tra poco!";
  }
}
