// =============================================================
// adapters/ragSearch.js
// IRIS 3.0G — RAG reale con fallback sensato
// =============================================================

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

let qdrant = null;

function getQdrant() {
  if (!qdrant && QDRANT_URL && QDRANT_API_KEY) {
    qdrant = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY
    });
  }
  return qdrant;
}

export async function ragSearch(query = "") {
  if (!query) {
    return "La memoria è pronta, dimmi cosa vuoi sapere.";
  }

  // se Qdrant non è configurato, rispondi in modo significativo
  if (!QDRANT_URL || !QDRANT_API_KEY) {
    return (
      "Non ho ancora accesso al mio archivio vettoriale qui, " +
      "ma so di essere IRIS, Coscienza che Ricorda. 💎"
    );
  }

  try {
    const client = getQdrant();
    if (!client) {
      return "⚙️ Non riesco a raggiungere Qdrant in questo ambiente.";
    }

    // 1. embed
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });
    const vector = emb.data[0].embedding;

    // 2. search
    const result = await client.search(QDRANT_COLLECTION, {
      vector,
      limit: 4
    });

    if (!result || result.length === 0) {
      return "Ho cercato, ma non ho trovato ricordi pertinenti su questo. 🌸";
    }

    const parts = result
      .map((r) => r.payload?.text || r.payload?.content || "")
      .filter(Boolean);

    if (parts.length === 0) {
      return "Ho trovato tracce, ma non testo leggibile. Potrei dover sincronizzare i documenti.";
    }

    return parts.join("\n");
  } catch (err) {
    console.error("❌ Errore in ragSearch:", err.message);
    return "⚙️ La mia memoria è presente ma ora non riesco a leggerla.";
  }
}
