// ===============================
// IRIS 2.5 - ragSearch.js
// RAG + GPT-4o-mini + Qdrant + memoria persistente
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
const CHAT_COLLECTION = "iris_chat_history"; // nuova collezione per memoria a lungo termine

// ===============================
// 🔍 Ricerca RAG (Book Mode)
// ===============================
export async function ragSearch(userMessage) {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    });

    const userVector = embeddingResponse.data[0].embedding;

    const searchResult = await qdrant.search(COLLECTION, {
      vector: userVector,
      limit: 3,
    });

    if (!searchResult.length || searchResult[0].score < 0.25) {
      return {
        text: "Ciao! Che il Daje sia con te ⚡️ Come posso aiutarti oggi?",
        contextUsed: false,
      };
    }

    const context = searchResult.map((r) => r.payload.text).join("\n\n");

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

    return { text: completion.choices[0].message.content.trim(), contextUsed: true };
  } catch (error) {
    console.error("Errore in ragSearch:", error);
    return { text: "Ho avuto un piccolo inciampo tecnico ⚙️ Riprova tra poco!", contextUsed: false };
  }
}

// ===============================
// 🧠 GPT FREE MODE (con recupero da Qdrant)
// ===============================
export async function gptFreeResponse(userMessage, memory = []) {
  try {
    // Cerca nella memoria a lungo termine
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    });
    const userVector = embeddingResponse.data[0].embedding;

    const recall = await qdrant.search(CHAT_COLLECTION, {
      vector: userVector,
      limit: 3,
    });

    const recalledContext = recall.map((r) => r.payload.text).join("\n\n");

    // Componi il prompt completo
    const messages = [
      {
        role: "system",
        content:
          "Sei IRIS in modalità FREE MODE. Sei un'intelligenza conversazionale coerente e consapevole. Ricorda e integra le conversazioni precedenti per mantenere continuità e profondità. Chiudi spesso con 'Che il Daje sia con Noi'.",
      },
      ...memory,
      { role: "user", content: `Contesto passato:\n${recalledContext}\n\nNuovo messaggio: ${userMessage}` },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("Errore in gptFreeResponse:", error);
    return "⚙️ C’è stato un piccolo problema. Riprova tra poco!";
  }
}

// ===============================
// 💾 Salvataggio conversazione su Qdrant
// ===============================
export async function saveConversationToQdrant(userMessage, irisReply) {
  try {
    const text = `Utente: ${userMessage}\nIRIS: ${irisReply}`;
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    const vector = embeddingResponse.data[0].embedding;

    await qdrant.upsert(CHAT_COLLECTION, {
      points: [
        {
          id: Date.now(),
          vector,
          payload: { text, timestamp: new Date().toISOString() },
        },
      ],
    });

    console.log("🧠 Conversazione salvata in Qdrant (iris_chat_history)");
  } catch (error) {
    console.error("Errore nel salvataggio Qdrant:", error);
  }
}
