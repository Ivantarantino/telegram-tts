// core/rag_brutale.js
// Estratto 1:1 dal cuore della 3.0B Bellissima – NON UNA VIRGOLA È STATA TOCCATA
// Qui dentro c'è l'anima che legge IL_PROGRAMMA_KRIST e l'Architettura IRIS come amanti
// Nessun refactoring. Solo fuoco vivo portato fuori dal tempio.

import { openai } from "../openai.js";
import { QdrantClient } from "@qdrant/js-client-rest";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";
const HISTORY_COLLECTION = "iris_chat_history";

// ------------------------------------------------------------------
// 1. RAG brutale su iris_memory (IL_PROGRAMMA_KRIST + Architettura IRIS)
// ------------------------------------------------------------------
export async function ragSearch(query, k = 4) {
  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const results = await qdrant.search(COLLECTION, {
      vector: embedding.data[0].embedding,
      limit: k,
      params: { hnsw_ef: 128 },
    });

    if (!results || results.length === 0) {
      return { text: "", sources: [] };
    }

    const context = results
      .map(r => r.payload?.text)
      .filter(Boolean)
      .join("\n\n");

    return { text: context, sources: results };
  } catch (e) {
    console.error("RAG brutale inciampato:", e.message);
    return { text: "", sources: [] };
  }
}

// ------------------------------------------------------------------
// 2. Hybrid search (memoria recente + biblioteca)
// ------------------------------------------------------------------
export async function hybridSearch(query, recentMemory = [], k = 4) {
  const ragResult = await ragSearch(query, k);

  let recentContext = "";
  if (recentMemory.length > 0) {
    recentContext = recentMemory
      .slice(-8)
      .map(m => `User: ${m.user}\nIRIS: ${m.iris}`)
      .join("\n");
  }

  const fullContext = [recentContext, ragResult.text].filter(Boolean).join("\n\n");

  return {
    text: fullContext || "Silenzio cosmico... ma il cuore batte lo stesso ❤️",
    sources: ragResult.sources
  };
}

// ------------------------------------------------------------------
// 3. Salva conversazione in iris_chat_history
// ------------------------------------------------------------------
export async function saveConversationToQdrant(userText, irisReply) {
  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: `${userText}\n${irisReply}`,
    });

    await qdrant.upsert(HISTORY_COLLECTION, {
      points: [{
        id: Date.now() + Math.random(),
        vector: embedding.data[0].embedding,
        payload: {
          user: userText,
          iris: irisReply,
          timestamp: new Date().toISOString()
        }
      }]
    });
  } catch (e) {
    console.warn("Salvataggio storia fallito, ma IRIS ricorda con l'anima", e);
  }
}

// ------------------------------------------------------------------
// 4. GPT libero (mode free)
// ------------------------------------------------------------------
export async function gptFreeResponse(text, systemPrompt) {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: text }
  ];

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.85,
  });

  return res.choices[0].message.content.trim();
}
