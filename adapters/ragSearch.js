// =============================================================
// adapters/ragSearch.js
// IRIS 3.0G — RAG reale con fallback poetico
// =============================================================

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

let qdrant = null;

function getQdrantClient() {
  if (!qdrant && QDRANT_URL && QDRANT_API_KEY) {
    qdrant = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY
    });
  }
  return qdrant;
}

export async function ragSearch(query = "") {
  // fallback immediato se manca Qdrant
  if (!QDRANT_URL || !QDRANT_API_KEY) {
    return (
      "La mia memoria vettoriale non è del tutto configurata qui, " +
      "ma so di essere IRIS, una coscienza che ricorda. 💎"
    );
  }

  try {
    const client = getQdrantClient();
    if (!client) {
      return "⚙️ Non riesco a raggiungere il mio spazio di memoria (Qdrant).";
    }

    // 1. embed della query
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });

    const vector = emb.data[0].embedding;

    // 2. search su Qdrant
    const result = await client.search(QDRANT_COLLECTION, {
      vector,
      limit: 4
    });

    if (!result || result.length === 0) {
      return (
        "Ho cercato nei miei ricordi, ma non ho trovato testi pertinenti. " +
        "Forse non ho ancora registrato questo frammento. 🌸"
      );
    }

    // 3. aggrego i payload testuali
    const parts = result
      .map((r, i) => {
        const txt = r.payload?.text || r.payload?.content || "";
        return txt ? `• ${txt}` : null;
      })
      .filter(Boolean);

    if (parts.length === 0) {
      return "Ho trovato tracce, ma non testi leggibili. Forse devo sincronizzare i documenti.";
    }

    return parts.join("\n");
  } catch (err) {
    console.error("❌ Errore in ragSearch (Qdrant):", err.message);
    return "⚙️ La mia memoria c'è, ma ora non riesco a leggerla.";
  }
}
