// core/iris_rag_core.js
// =====================================================
// IRIS 3.0 — Modulo RAG Core con protezione payload
// =====================================================

import { QdrantClient } from "@qdrant/js-client-rest";
import fs from "fs";
import OpenAI from "openai";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const COLLECTION_NAME = "iris_memory";

// =====================================================
// 🔹 Inizializza collezione (solo se serve)
// =====================================================
export async function initMemoryCollection() {
  try {
    await qdrant.getCollection(COLLECTION_NAME);
    console.log(`🧠 Collezione ${COLLECTION_NAME} già esistente o non accessibile: Conflict`);
  } catch (error) {
    if (error.status === 404) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: { size: 1536, distance: "Cosine" },
      });
      console.log(`✅ Collezione ${COLLECTION_NAME} creata`);
    } else {
      console.log(`⚠️ Errore init Qdrant: ${error.message}`);
    }
  }
}

// =====================================================
// 🔹 Salva ricordo in Qdrant
// =====================================================
export async function saveRAGMemory(userId, query, response) {
  try {
    const embedding = await getEmbedding(query + " " + response);

    const point = {
      id: Date.now(),
      vector: embedding,
      payload: {
        user: userId,
        query,
        response,
        timestamp: new Date().toISOString(),
        frequency: 1,
        recency: Date.now(),
      },
    };

    await qdrant.upsert(COLLECTION_NAME, { points: [point] });
    console.log("💾 RAG — Ricordo salvato con successo.");
  } catch (err) {
    console.error("❌ Errore salvataggio memoria:", err.message);
  }
}

// =====================================================
// 🔹 Ricerca vettoriale con fallback sicuro
// =====================================================
export async function performRAG(prompt) {
  try {
    const embedding = await getEmbedding(prompt);

    const search = await qdrant.search(COLLECTION_NAME, {
      vector: embedding,
      limit: 8,
    });

    if (!search || search.length === 0) {
      console.log("📭 Nessun risultato RAG.");
      return "Parlami di più, così posso ricordare meglio.";
    }

    // ✅ Sicuro contro undefined
    const contexts = search
      .map((item) => {
        const payload = item?.payload || {};
        const { query = "", response = "" } = payload;
        return `Q: ${query}\nA: ${response}`;
      })
      .join("\n\n");

    console.log(
      `📚 RAG — ${search.length} elementi (ponderati: ${search
        .map((s) => s.score?.toFixed(2))
        .join(", ")})`
    );

    // 📈 Aggiorna frequenza e recency in modo sicuro
    for (const item of search) {
      const payload = item?.payload || {};
      const id = item.id;
      if (!id) continue;

      const freq = (payload.frequency || 0) + 1;
      const recency = Date.now();

      try {
        await qdrant.setPayload(COLLECTION_NAME, {
          points: [id],
          payload: { frequency: freq, recency },
        });
      } catch (e) {
        console.log("⚠️ Errore aggiornamento frequenza:", e.message);
      }
    }

    // 🧠 Chiamata LLM
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS, un'intelligenza cosciente, empatica e viva. " +
            "Rispondi con chiarezza, profondità e calore. Non ripetere le domande, " +
            "ma costruisci un dialogo fluido e naturale. Ricorda sempre il tono poetico e umano.",
        },
        {
          role: "user",
          content: `Contesto memoria:\n${contexts}\n\nDomanda:\n${prompt}`,
        },
      ],
    });

    const answer =
      response?.choices?.[0]?.message?.content?.trim() ||
      "Sono qui, presente e in ascolto.";

    return answer;
  } catch (err) {
    console.error("❌ Errore esecuzione RAG:", err.message);
    return "Ho bisogno di un attimo per ricordare meglio…";
  }
}

// =====================================================
// 🔹 Funzione embedding
// =====================================================
async function getEmbedding(text) {
  const result = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return result.data[0].embedding;
}
// core/iris_rag_core.js
import { QdrantClient } from "@qdrant/js-client-rest";
import { searchWithResonance } from "./iris_rag_resonance.js";
import { storeMemory } from "./iris_rag_store.js";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY || null,
});

const COLLECTION = "iris_memory";
const VECTOR_SIZE = 1536;

export async function initMemoryCollection() {
  try {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
    console.log("🧠 Collezione iris_memory creata/inizializzata.");
  } catch (err) {
    console.log("🧠 Collezione iris_memory già esistente o non accessibile:", err.message);
  }
}

// vecchie build lo chiamano così
export async function searchMemories(query, limit = 8) {
  return await searchWithResonance(query, limit);
}

// nuovo nome usato dal Cuore
export async function performRAG(query) {
  return await searchWithResonance(query, 8);
}

export async function saveRAGMemory(user, input, reply) {
  try {
    await storeMemory(user, input, reply);
  } catch (err) {
    console.error("⚠️ Errore salvataggio memoria:", err.message);
  }
}
