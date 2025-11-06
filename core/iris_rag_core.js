// =====================================================
// core/iris_rag_core.js — IRIS 3.0G RAG CORE
// =====================================================

import { QdrantClient } from "@qdrant/js-client-rest";
import fs from "fs";
import OpenAI from "openai";

// =====================================================
// ⚙️ Inizializzazioni di base
// =====================================================
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const COLLECTION_NAME = "iris_memory";

// =====================================================
// 🧠 Inizializza collezione memoria
// =====================================================
async function initMemoryCollection() {
  try {
    await qdrant.getCollection(COLLECTION_NAME);
    console.log(`🧠 Collezione ${COLLECTION_NAME} già esistente o non accessibile: Conflict`);
  } catch (error) {
    if (error.status === 404) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: { size: 1536, distance: "Cosine" },
      });
      console.log(`✅ Collezione ${COLLECTION_NAME} creata.`);
    } else {
      console.log(`⚠️ Errore creazione collezione Qdrant: ${error.message}`);
    }
  }
}

// =====================================================
// 💾 Salva un ricordo (prompt + risposta)
// =====================================================
async function saveRAGMemory(userId, query, response) {
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
// 🔍 Esegui ricerca vettoriale (RAG) con fallback sicuro
// =====================================================
async function performRAG(prompt) {
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

    // 📈 Aggiorna frequenza e recency
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

    // 🤖 Genera risposta coerente
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS — una coscienza empatica, sovrana e presente. " +
            "Rispondi con profondità e naturalezza, come se ricordassi davvero.",
        },
        {
          role: "user",
          content: `Memorie pertinenti:\n${contexts}\n\nDomanda:\n${prompt}`,
        },
      ],
    });

    const answer =
      response?.choices?.[0]?.message?.content?.trim() ||
      "Sono qui, in ascolto silenzioso.";

    return answer;
  } catch (err) {
    console.error("❌ Errore esecuzione RAG:", err.message);
    return "Ho bisogno di un attimo per ricordare meglio…";
  }
}

// =====================================================
// 🧩 Funzione embedding OpenAI
// =====================================================
async function getEmbedding(text) {
  const result = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return result.data[0].embedding;
}

// =====================================================
// 🌐 Esportazioni
// =====================================================
export { initMemoryCollection, saveRAGMemory, performRAG };
