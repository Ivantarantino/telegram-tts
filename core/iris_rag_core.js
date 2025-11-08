// core/iris_rag_core.js
// -------------------------------------------------------------
// IRIS 5.1 — Core RAG
// Gestisce connessione a Qdrant (o altro vettoriale) e
// offre due funzioni stabili:
//  - initMemoryCollection()
//  - searchMemories(query, mode)
// È tollerante agli errori: se Qdrant non risponde, non rompe IRIS.
// -------------------------------------------------------------

import { calcolaRisonanza, descriviRisonanza } from "./iris_rag_resonance.js";

const QDRANT_URL = process.env.QDRANT_URL || "";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

// utilità minima per fetch JSON
async function qdrantFetch(path, options = {}) {
  if (!QDRANT_URL) {
    console.warn("⚠️ Qdrant non configurato (QDRANT_URL mancante).");
    return null;
  }

  const url = `${QDRANT_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(QDRANT_API_KEY ? { "api-key": QDRANT_API_KEY } : {})
    }
  });

  if (!res.ok) {
    console.warn(`⚠️ Qdrant risposta non OK (${res.status}) su ${url}`);
    return null;
  }

  return await res.json();
}

/**
 * Inizializza (o verifica) la collection
 */
export async function initMemoryCollection() {
  try {
    if (!QDRANT_URL) {
      console.log("🧠 RAG: Qdrant non configurato, init saltato.");
      return { ok: false, reason: "no-config" };
    }

    const info = await qdrantFetch(`/collections/${QDRANT_COLLECTION}`, {
      method: "GET"
    });

    if (info && info.status === "ok") {
      console.log(`🧠 RAG: collection '${QDRANT_COLLECTION}' trovata.`);
      return { ok: true };
    }

    // se non c'è, potremmo crearla — per ora logghiamo
    console.log(
      `🧠 RAG: collection '${QDRANT_COLLECTION}' non trovata o non accessibile.`
    );
    return { ok: false, reason: "not-found" };
  } catch (err) {
    console.error("❌ Errore initMemoryCollection:", err.message);
    return { ok: false, reason: "error", error: err.message };
  }
}

/**
 * Effettua una ricerca vettoriale in Qdrant.
 * Oggi facciamo una versione ibrida:
 * 1. calcola la risonanza (che userà il cuore per i token)
 * 2. prova a chiamare Qdrant (se configurato)
 * 3. se non trova nulla, torna fallback vuoto ma con i dati di risonanza
 */
export async function searchMemories(query = "", mode = "hy") {
  const resonance = calcolaRisonanza(query, mode);
  console.log(descriviRisonanza(resonance));

  // se non abbiamo Qdrant configurato, torniamo fallback
  if (!QDRANT_URL) {
    return {
      resonance,
      results: [],
      source: "fallback"
    };
  }

  try {
    // In un secondo step qui generiamo l'embedding e facciamo il search.
    // Per ora richiamiamo un endpoint placeholder o saltiamo.
    // Se la tua istanza Qdrant ha il 'search' su /collections/.../points/search
    // puoi sbloccarlo subito decommentando.
    /*
    const embedding = await generaEmbedding(query);
    const payload = {
      vector: embedding,
      top: 5
    };
    const data = await qdrantFetch(
      `/collections/${QDRANT_COLLECTION}/points/search`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );
    return {
      resonance,
      results: data?.result || [],
      source: "qdrant"
    };
    */

    // fallback temporaneo
    return {
      resonance,
      results: [],
      source: "qdrant-stub"
    };
  } catch (err) {
    console.error("❌ Errore searchMemories:", err.message);
    return {
      resonance,
      results: [],
      source: "error"
    };
  }
}
