// core/iris_rag_core.js
// ------------------------------------------------------
// IRIS 4.8 — Memoria Viva (RAG + Cuore)
// Usa Qdrant come archivio vettoriale
// ------------------------------------------------------

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

// helper per chiamare Qdrant
async function qdrantFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(QDRANT_API_KEY ? { "api-key": QDRANT_API_KEY } : {})
  };
  const res = await fetch(`${QDRANT_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });
  return res.json();
}

// crea la collection se non esiste
export async function ensureIrisCollection() {
  try {
    const info = await qdrantFetch(`/collections/${QDRANT_COLLECTION}`);
    if (info.status === "ok") return;
  } catch (_) {
    // se non esiste, la creiamo
  }

  await qdrantFetch(`/collections/${QDRANT_COLLECTION}`, {
    method: "PUT",
    body: JSON.stringify({
      vectors: {
        size: 1536,
        distance: "Cosine"
      }
    })
  });
}

// embedding con OpenAI
async function embedText(text) {
  const clean = text.trim();
  if (!clean) return null;
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: clean
  });
  return emb.data[0].embedding;
}

/**
 * Salva un ricordo in Qdrant
 * @param {string} userText - quello che ha detto Ivano
 * @param {string} irisReply - quello che ha risposto IRIS
 * @param {object} meta - informazioni aggiuntive (mode, weights, timestamp)
 */
export async function storeMemoryVector(userText, irisReply, meta = {}) {
  try {
    await ensureIrisCollection();
    const vec = await embedText(userText);
    if (!vec) return;

    const payload = {
      user_text: userText,
      iris_reply: irisReply,
      ...meta,
      ts: new Date().toISOString()
    };

    await qdrantFetch(`/collections/${QDRANT_COLLECTION}/points?wait=true`, {
      method: "PUT",
      body: JSON.stringify({
        points: [
          {
            id: Date.now(),
            vector: vec,
            payload
          }
        ]
      })
    });
  } catch (err) {
    console.error("❌ RAG: errore nel salvataggio memoria:", err);
  }
}

/**
 * Recupera i ricordi più vicini ad un testo
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function searchMemories(query, limit = 4) {
  try {
    await ensureIrisCollection();
    const vec = await embedText(query);
    if (!vec) return [];

    const res = await qdrantFetch(`/collections/${QDRANT_COLLECTION}/points/search`, {
      method: "POST",
      body: JSON.stringify({
        vector: vec,
        limit,
        with_payload: true,
        score_threshold: 0.35
      })
    });

    if (!res?.result) return [];
    return res.result;
  } catch (err) {
    console.error("❌ RAG: errore nella ricerca:", err);
    return [];
  }
}

/**
 * Restituisce una sintesi umana dei ricordi passati
 * da mostrare in /essence
 */
export async function summarizeRecentMemories(query = "stato attuale di IRIS") {
  const memories = await searchMemories(query, 6);
  if (!memories.length) return "Memoria viva avviata. Nessun ricordo rilevante ancora.";

  const lines = memories.map((m, i) => {
    const p = m.payload || {};
    return `${i + 1}. ${p.user_text ? `Tu: ${p.user_text}` : ""} ${p.iris_reply ? `→ IRIS: ${p.iris_reply}` : ""}`.trim();
  });

  return ["Memoria Viva (ultimi scambi):", ...lines].join("\n");
}
