// =====================================================
// IRIS 3.9.1+ — RAGSEARCH
// Qdrant semantico + GPT-4o-mini
// Usato da index.js in modalità HY e BOOK
// =====================================================

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";
const TOP_K = 5;
const SCORE_MIN = 0.25;

// ----------- EMBEDDING -----------
async function embedText(text) {
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return emb.data[0].embedding;
}

// ----------- PRINCIPALE -----------
export async function ragSearch(query) {
  try {
    const vec = await embedText(query);
    const res = await qdrant.search(COLLECTION, {
      vector: vec,
      limit: TOP_K,
      with_payload: true
    });

    if (!res?.length || res[0].score < SCORE_MIN) {
      return "Nessun frammento rilevante trovato nella memoria vettoriale.";
    }

    const context = res
      .map(r => r.payload?.text || r.payload?.chunk || "")
      .filter(Boolean)
      .join("\n---\n");

    console.log(`🔍 Qdrant → ${res.length} risultati, top score ${res[0].score.toFixed(3)}`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS in HYBRID MODE. Usa il contesto come memoria profonda, " +
            "rispondi in modo naturale, coerente e caldo, senza citazioni letterali."
        },
        {
          role: "user",
          content: `Contesto:\n${context}\n\nDomanda: ${query}`
        }
      ]
    });

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ Errore ragSearch:", err.message);
    return "⚙️ Errore nel recupero dal RAG. Ti rispondo con ciò che ricordo internamente.";
  }
}
