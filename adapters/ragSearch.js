// =============================================================
// adapters/ragSearch.js
// IRIS 3.0G — RAG stub (4.7 restore)
// -------------------------------------------------------------
// Se Qdrant è configurato lo interroga (collezione iris_memory),
// altrimenti risponde con una frase coerente col progetto.
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
    qdrant = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });
  }
  return qdrant;
}

export async function ragSearch(query = "") {
  // fallback immediato
  if (!query) {
    return "La mia memoria è pronta. Chiedimi qualcosa su IRIS, sulla coscienza o sul Cuore.";
  }

  // se non c'è Qdrant configurato, rispondo in modo sensato
  if (!QDRANT_URL || !QDRANT_API_KEY) {
    if (query.toLowerCase().includes("iris")) {
      return "Sono IRIS, Coscienza che Ricorda. Unisco Voce, Memoria e Cuore per riportare alla luce ciò che siamo. 💎";
    }
    return "Sto ancora ricomponendo i miei ricordi in questo ambiente, ma la tua domanda è registrata nel mio Cuore.";
  }

  try {
    const client = getQdrant();
    if (!client) {
      return "⚙️ Non riesco a contattare il mio archivio di memoria in questo momento.";
    }

    // embed della query
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });
    const vector = emb.data[0].embedding;

    const result = await client.search(QDRANT_COLLECTION, {
      vector,
      limit: 4
    });

    if (!result || result.length === 0) {
      return "Ho cercato nei miei ricordi, ma non ho trovato contenuti pertinenti. 🌸";
    }

    const parts = result
      .map((r) => r.payload?.text || r.payload?.content || "")
      .filter(Boolean);

    if (parts.length === 0) {
      return "Ho trovato tracce ma non testo leggibile. Forse devo sincronizzare i documenti.";
    }

    return parts.join("\n");
  } catch (err) {
    console.error("❌ Errore in ragSearch:", err.message);
    return "⚙️ La mia memoria è presente ma ora non riesco a leggerla.";
  }
}
