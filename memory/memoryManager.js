// memory/memoryManager.js
// ---------------------------------------------------------
// IRIS — Memoria Vettoriale Base (5.0.9.0)
// Obiettivo di questo step:
// - Collegare IRIS a Qdrant.
// - Creare (se serve) o usare la collezione "iris_memory".
// - Salvare automaticamente OGNI scambio:
//     • testo utente
//     • risposta di IRIS
//   come due punti vettoriali distinti, con peso base di recenza.
// ---------------------------------------------------------

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API,
});

// ---------------------------------------------------------
// Config Qdrant
// ---------------------------------------------------------
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION || "iris_memory";

// Per sicurezza, teniamo un flag locale
let collectionReady = false;

let qdrant = null;

if (QDRANT_URL && QDRANT_API_KEY) {
  qdrant = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
  });
} else {
  console.warn(
    "⚠️ [IRIS_MEMORY] Qdrant non configurato (QDRANT_URL / QDRANT_API_KEY mancanti). La memoria vettoriale sarà disattivata.",
  );
}

// ---------------------------------------------------------
// Helper: assicura che la collezione esista
// ---------------------------------------------------------
async function ensureCollection() {
  if (!qdrant) return;
  if (collectionReady) return;

  try {
    await qdrant.getCollection(QDRANT_COLLECTION);
    console.log(
      `🧠 [IRIS_MEMORY] Collection '${QDRANT_COLLECTION}' trovata e pronta.`,
    );
    collectionReady = true;
  } catch (err) {
    // Se non esiste, proviamo a crearla
    console.log(
      `ℹ️ [IRIS_MEMORY] Collection '${QDRANT_COLLECTION}' non trovata, tentativo di creazione...`,
    );
    try {
      await qdrant.createCollection(QDRANT_COLLECTION, {
        vectors: {
          size: 1536, // text-embedding-3-small
          distance: "Cosine",
        },
      });
      console.log(
        `🧠 [IRIS_MEMORY] Collection '${QDRANT_COLLECTION}' creata.`,
      );
      collectionReady = true;
    } catch (createErr) {
      console.error(
        "❌ [IRIS_MEMORY] Errore nella creazione della collection:",
        createErr,
      );
    }
  }
}

// ---------------------------------------------------------
// Helper: embedding di un testo (1536 dimensioni)
// ---------------------------------------------------------
async function embedText(text) {
  const clean = (text || "").toString().trim();
  if (!clean) return null;

  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: clean,
  });

  return emb.data[0].embedding;
}

// ---------------------------------------------------------
// API principale: processMemory(userText, irisText)
// ---------------------------------------------------------
// - userText: ciò che ha scritto/detto l'utente
// - irisText: risposta generata da IRIS
// Entrambi vengono salvati come punti separati nella stessa collezione.
// ---------------------------------------------------------
export async function processMemory(userText, irisText) {
  if (!qdrant) {
    // Qdrant non configurato, esco silente
    return;
  }

  const u = (userText || "").toString().trim();
  const i = (irisText || "").toString().trim();

  if (!u && !i) return;

  try {
    await ensureCollection();

    const timestamp = Date.now(); // peso base di recenza
    const points = [];
    const baseId = timestamp; // usiamo int puro per evitare problemi di formattazione

    // 1) Punto utente
    if (u) {
      const vecUser = await embedText(u);
      if (vecUser) {
        points.push({
          id: baseId, // intero: valido per Qdrant come "unsigned integer"
          vector: vecUser,
          payload: {
            role: "user",
            text: u,
            timestamp,
            recency_weight: 1.0, // per ora semplice, in futuro dinamico
            source: "iris_memory",
            channel: "telegram",
          },
        });
      }
    }

    // 2) Punto IRIS
    if (i) {
      const vecIris = await embedText(i);
      if (vecIris) {
        points.push({
          id: baseId + 1,
          vector: vecIris,
          payload: {
            role: "iris",
            text: i,
            timestamp,
            recency_weight: 1.0,
            source: "iris_memory",
            channel: "telegram",
          },
        });
      }
    }

    if (!points.length) return;

    await qdrant.upsert(QDRANT_COLLECTION, {
      wait: true,
      points,
    });

    console.log(
      `🧠 [IRIS_MEMORY] Salvati ${points.length} punti in Qdrant (${QDRANT_COLLECTION}).`,
    );
  } catch (err) {
    console.error("❌ [IRIS_MEMORY] Errore in processMemory:", err);
  }
}
