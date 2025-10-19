// ===============================
// IRIS 2.6b - ragSearch.js
// Modalità BOOK / FREE / HYBRID + Qdrant memory
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

    const searchResult = await qdrant.search(COLLECTION, {
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
// 🧠 FREE MODE
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
// ⚗️ HYBRID MODE
// ===============================
export async function hybridSearch(userMessage, memory = []) {
  try {
    // 1️⃣ Recupera contesto dai libri
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    });
    const userVector = embeddingResponse.data[0].embedding;

    const searchResult = await qdrant.search(COLLECTION, {
      vector: userVector,
      limit: 5,
    });

    const bookContext = searchResult.map((r) => r.payload.text).join("\n\n");

    // 2️⃣ Recupera memoria conversazionale
    const recall = await qdrant.search(CHAT_COLLECTION, {
      vector: userVector,
      limit: 3,
    });

    const recalledChat = recall.map((r) => r.payload.text).join("\n\n");

    // 3️⃣ Prompt ibrido
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
// 💾 Salvataggio memoria su Qdrant
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
