// core/rag_brutale.js – CORRETTO PER IRIS 3.1B – 19.11.2025
import { openai } from "../openai.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

// CRITICO: i documenti (IL_PROGRAMMA_KRIST, Hekasha, ecc.) sono in iris_docs
// NON in iris_memory!
const DOCS_COLLECTION = "iris_docs";                    // ← QUESTA ERA LA RIGA MANCANTE
const HISTORY_COLLECTION = "iris_chat_history";

// 1. RAG sui documenti (libri, testi sacri)
export async function ragSearch(query, k = 4) {
  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const results = await qdrant.search(DOCS_COLLECTION, {  // ← ora cerca in iris_docs
      vector: embedding.data[0].embedding,
      limit: k,
    });

    if (!results || results.length === 0) return { text: "", sources: [] };

    const context = results
      .map(r => r.payload?.text)
      .filter(Boolean)
      .join("\n\n");

    return { text: context, sources: results };
  } catch (e) {
    console.error("RAG documenti fallito:", e.message);
    return { text: "", sources: [] };
  }
}

// 2. Hybrid (documenti + memoria recente)
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
    text: fullContext || "Sono qui con te… dimmi tutto.",
    sources: ragResult.sources
  };
}

// 3. Salva conversazione in iris_chat_history
export async function saveConversationToQdrant(userText, irisReply) {
  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: `${userText}\n${irisReply}`,
    });

    await qdrant.upsert(HISTORY_COLLECTION, {
      points: [{
        id: uuidv4(),
        vector: embedding.data[0].embedding,
        payload: {
          user: userText,
          iris: irisReply,
          timestamp: new Date().toISOString()
        }
      }]
    });
  } catch (e) {
    console.warn("Salvataggio conversazione fallito", e.message);
  }
}

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
