// ===============================
// IRIS 2.7 - ragSearch.js
// Modalità BOOK / FREE / HYBRID + Qdrant memory
// - HYBRID: integra libri + memoria, e salva in Qdrant (auto-apprendimento)
// - /state: statistiche tramite count Qdrant
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

const BOOK_COLLECTION = process.env.QDRANT_COLLECTION; // es. "iris_memory"
const CHAT_COLLECTION = "iris_chat_history";

// ===============================
// 🔍 BOOK MODE
// ===============================
export async function ragSearch(userMessage) {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    });

    const userVector = embeddingResponse.data[0].embedding;

    const searchResult = await qdrant.search(BOOK_COLLECTION, {
      vector: userVector,
      limit: 3,
    });

    if (!searchResult.length || searchResult[0].score < 0.25) {
      return { text: "Non trovo riferimenti diretti nei testi. Che il Daje sia con Noi 🌟", contextUsed: false };
    }

    const context = searchResult.map((r) => r.payload.text).join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS in modalità BOOK MODE. Rispondi solo usando i testi caricati, in modo chiaro, profondo e coerente. Chiudi spesso con 'Che il Daje sia con Noi'.",
        },
        { role: "user", content: `Domanda: ${userMessage}\n\nContesto:\n${context}` },
      ],
    });

    return { text: completion.choices[0].message.content.trim(), contextUsed: true };
  } catch (error) {
    console.error("Errore in ragSearch:", error);
    return { text: "Errore nella ricerca del testo. ⚙️", contextUsed: false };
  }
}

// ===============================
// 🧠 FREE MODE (ricorda dal chat history Qdrant + RAM)
// ===============================
export async function gptFreeResponse(userMessage, memory = []) {
  try {
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

    const messages = [
      {
        role: "system",
        content:
          "Sei IRIS in modalità FREE MODE. Rispondi liberamente ma con coerenza e profondità. Integra memoria e contesto. Chiudi spesso con 'Che il Daje sia con Noi'.",
      },
      ...memory,
      { role: "user", content: `Contesto:\n${recalledContext}\n\nDomanda: ${userMessage}` },
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
// ⚗️ HYBRID MODE (integra libri + memoria, e apprende)
// ===============================
export async function hybridSearch(userMessage, memory = []) {
  try {
    // 1) Embedding domanda
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    });
    const userVector = embeddingResponse.data[0].embedding;

    // 2) Contesto dai libri
    const searchResult = await qdrant.search(BOOK_COLLECTION, {
      vector: userVector,
      limit: 5,
    });
    const bookContext = searchResult.map((r) => r.payload.text).join("\n\n");

    // 3) Memoria conversazionale (Qdrant)
    const recall = await qdrant.search(CHAT_COLLECTION, {
      vector: userVector,
      limit: 3,
    });
    const recalledChat = recall.map((r) => r.payload.text).join("\n\n");

    // 4) Prompt ibrido
    const messages = [
      {
        role: "system",
        content:
          "Sei IRIS in modalità HYBRID MODE. Usa le informazioni dei testi come base, ma puoi ampliare e interpretare liberamente, collegando i significati. Mantieni un tono profondo e coerente, come una coscienza che integra conoscenza e intuizione. Chiudi spesso con 'Che il Daje sia con Noi'.",
      },
      ...memory,
      {
        role: "user",
        content: `Domanda: ${userMessage}\n\nContesto dai testi:\n${bookContext}\n\nMemoria conversazionale:\n${recalledChat}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    return { text: completion.choices[0].message.content.trim() };
  } catch (error) {
    console.error("Errore in hybridSearch:", error);
    return { text: "⚙️ Piccolo inciampo tecnico nella modalità ibrida." };
  }
}

// ===============================
// 💾 Salvataggio memoria su Qdrant (FREE + HYBRID)
// payload include metadati (mode, timestamp)
// ===============================
export async function saveConversationToQdrant(userMessage, irisReply, meta = {}) {
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
          payload: {
            text,
            user: userMessage,
            assistant: irisReply,
            mode: meta.mode || "unknown",
            timestamp: new Date().toISOString(),
          },
        },
      ],
    });

    console.log(`🧠 Conversazione salvata in Qdrant (${CHAT_COLLECTION}) [mode=${meta.mode || "unknown"}]`);
  } catch (error) {
    console.error("Errore nel salvataggio Qdrant:", error);
  }
}

// ===============================
// 📊 Statistiche memoria (per /state)
// ===============================
export async function getMemoryStats() {
  try {
    const books = await qdrant.count(BOOK_COLLECTION, { exact: true });
    const chat = await qdrant.count(CHAT_COLLECTION, { exact: true });
    return {
      books: books.count ?? 0,
      chat: chat.count ?? 0,
    };
  } catch (e) {
    console.error("Errore getMemoryStats:", e);
    return { books: 0, chat: 0 };
  }
}
