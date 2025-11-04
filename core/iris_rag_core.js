// core/iris_rag_core.js
// ------------------------------------------------------
// IRIS 4.8 — Memoria Viva (RAG + Cuore)
// Gestione memoria vettoriale su Qdrant
// ------------------------------------------------------

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Config Qdrant
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

// ------------------------------------------------------
// Helper HTTP verso Qdrant
// ------------------------------------------------------
async function qdrantFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(QDRANT_API_KEY ? { "api-key": QDRANT_API_KEY } : {})
  };

  const res = await fetch(`${QDRANT_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  return res.json();
}

// ------------------------------------------------------
// Assicura che la collection esista
// ------------------------------------------------------
export async function ensureIrisCollection() {
  // se non abbiamo URL valido, usciamo
  if (!QDRANT_URL) {
    console.warn("⚠️ RAG: QDRANT_URL non definito, memoria vettoriale disattivata.");
    return;
  }

  try {
    const info = await qdrantFetch(`/collections/${QDRANT_COLLECTION}`);
    if (info?.status === "ok") return;
  } catch (err) {
    // se non esiste, la creiamo
  }

  try {
    await qdrantFetch(`/collections/${QDRANT_COLLECTION}`, {
      method: "PUT",
      body: JSON.stringify({
        vectors: {
          size: 1536,
          distance: "Cosine"
        }
      })
    });
    console.log(`🧠 RAG: collection "${QDRANT_COLLECTION}" pronta.`);
  } catch (err) {
    console.error("❌ RAG: impossibile creare la collection:", err);
  }
}

// ------------------------------------------------------
// Embedding con OpenAI
// ------------------------------------------------------
async function embedText(text) {
  const clean = (text || "").toString().trim();
  if (!clean) return null;
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: clean
    });
    return emb.data[0].embedding;
  } catch (err) {
    console.error("❌ RAG: errore nella creazione embedding:", err);
    return null;
  }
}

// ------------------------------------------------------
// Salvataggio memoria (userText + irisReply) su Qdrant
// ------------------------------------------------------
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
            id: Date.now(),          // id semplice
            vector: vec,
            payload
          }
        ]
      })
    });

    // console.log("📝 RAG: memoria salvata.");
  } catch (err) {
    console.error("❌ RAG: errore nel salvataggio memoria:", err);
  }
}

// ------------------------------------------------------
// Ricerca dei ricordi più simili
// ------------------------------------------------------
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
    console.error("❌ RAG: errore nella ricerca memoria:", err);
    return [];
  }
}

// ------------------------------------------------------
// Sintesi compatta per /essence
// ------------------------------------------------------
export async function summarizeRecentMemories(query = "stato attuale di IRIS") {
  const memories = await searchMemories(query, 6);
  if (!memories.length) {
    return "Memoria viva avviata. Nessun ricordo rilevante ancora.";
  }

  const lines = memories.map((m, i) => {
    const p = m.payload || {};
    const user = p.user_text ? `Tu: ${p.user_text}` : "";
    const iris = p.iris_reply ? ` → IRIS: ${p.iris_reply}` : "";
    return `${i + 1}. ${user}${iris}`.trim();
  });

  return ["Memoria Viva (ultimi scambi):", ...lines].join("\n");
}
