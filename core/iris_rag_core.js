// core/iris_rag_core.js
// ---------------------------------------------------------
// IRIS — RAG Core 5.0.9.0
// - Connessione a Qdrant
// - Ricerca semantica con text-embedding-3-small
// - Calcolo di una risonanza φ semplice
// - Ritorna un contesto testuale da passare a irisHeartSpeak
// ---------------------------------------------------------

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API,
});

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION || "iris_memory";

let qdrant = null;

if (QDRANT_URL && QDRANT_API_KEY) {
  qdrant = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
  });
} else {
  console.warn(
    "⚠️ [IRIS_RAG_CORE] Qdrant non configurato (QDRANT_URL / QDRANT_API_KEY mancanti).",
  );
}

// ---------------------------------------------------------
// Utilità: normalizza valore tra 0 e 1
// ---------------------------------------------------------
function clamp01(v) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

// ---------------------------------------------------------
// Calcolo risonanza φ in base allo score Qdrant
// ---------------------------------------------------------
function computeResonanceFromScore(bestScore = 0, mode = "book") {
  // Qdrant di solito dà score ~0.2–0.9: lo normalizziamo a [0,1]
  const base = clamp01(bestScore);

  let modeBoost = 0;
  if (mode === "hy") modeBoost = 0.10;
  if (mode === "book") modeBoost = 0.15;
  if (mode === "free") modeBoost = 0.0;

  const phi = clamp01(base + modeBoost);

  let level = "light";
  if (phi > 0.60) level = "deep";
  else if (phi > 0.30) level = "medium";

  const suggestedTokens =
    level === "light" ? 250 : level === "medium" ? 450 : 700;

  return {
    phi: Number(phi.toFixed(3)),
    level,
    suggestedTokens,
    debug: {
      base: Number(base.toFixed(3)),
      modeBoost: Number(modeBoost.toFixed(3)),
      fromMode: mode,
    },
  };
}

// ---------------------------------------------------------
// Ricerca semantica in Qdrant
// ---------------------------------------------------------
export async function searchMemories(query, mode = "book") {
  if (!qdrant) {
    console.warn(
      "⚠️ [IRIS_RAG_CORE] searchMemories chiamato senza Qdrant configurato.",
    );
    return {
      ok: false,
      phi: 0,
      level: "light",
      suggestedTokens: 250,
      debug: { reason: "no-qdrant" },
      ragContext: [],
      items: [],
    };
  }

  const cleanQuery = (query || "").toString().trim();
  if (!cleanQuery) {
    return {
      ok: false,
      phi: 0,
      level: "light",
      suggestedTokens: 250,
      debug: { reason: "empty-query" },
      ragContext: [],
      items: [],
    };
  }

  try {
    // 1) Embedding query
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanQuery,
    });
    const vector = emb.data[0].embedding;

    // 2) Ricerca in Qdrant
    const limit = mode === "book" ? 6 : 4;
    const score_threshold = mode === "book" ? 0.22 : 0.25;

    const results = await qdrant.search(QDRANT_COLLECTION, {
      vector,
      limit,
      score_threshold,
      with_payload: true,
    });

    if (!results || results.length === 0) {
      const res = computeResonanceFromScore(0, mode);
      console.log(
        "🔎 [IRIS_RAG_CORE] Nessun risultato Qdrant per la query.",
      );
      console.log(
        "🔎 [IRIS_RAG_CORE] Risonanza calcolata:",
        JSON.stringify(
          {
            phi: res.phi,
            suggestedTokens: res.suggestedTokens,
            level: res.level,
            debug: res.debug,
          },
          null,
          2,
        ),
      );
      return {
        ok: false,
        ...res,
        ragContext: [],
        items: [],
      };
    }

    const items = results.map((r, idx) => {
      const payload = r.payload || {};
      const text =
        payload.text ||
        payload.content ||
        payload.chunk ||
        "";
      return {
        id: r.id,
        rank: idx + 1,
        score: Number((r.score ?? 0).toFixed(3)),
        text,
        source: payload.source || payload.file || "memory",
        type: payload.type || "unknown",
        timestamp: payload.timestamp || null,
      };
    });

    const bestScore = Math.max(
      ...items.map((it) => it.score || 0),
    );
    const res = computeResonanceFromScore(bestScore, mode);

    // Costruiamo un contesto testuale compatto
    const ragContext = items
      .map((it) => it.text)
      .filter((t) => t && t.trim())
      .slice(0, 4);

    console.log(
      "🔎 [IRIS_RAG_CORE] Risonanza calcolata:",
      JSON.stringify(
        {
          phi: res.phi,
          suggestedTokens: res.suggestedTokens,
          level: res.level,
          debug: {
            ...res.debug,
            contextCount: ragContext.length,
          },
        },
        null,
        2,
      ),
    );

    return {
      ok: true,
      ...res,
      ragContext,
      items,
    };
  } catch (err) {
    console.error("❌ [IRIS_RAG_CORE] Errore in searchMemories:", err);
    return {
      ok: false,
      phi: 0,
      level: "light",
      suggestedTokens: 250,
      debug: { reason: "error", message: err.message },
      ragContext: [],
      items: [],
    };
  }
}

// ---------------------------------------------------------
// ragAnswerFromQuery: costruisce un testo-contesto per irisHeartSpeak
// ---------------------------------------------------------
export async function ragAnswerFromQuery(query, mode = "book") {
  const res = await searchMemories(query, mode);

  if (!res.ok || !res.ragContext || res.ragContext.length === 0) {
    return ""; // nessun contesto utile → lascio fare a IRIS “pura”
  }

  const { phi, level, suggestedTokens, debug, ragContext, items } =
    res;

  let header = `🔎 Risonanza memoria: φ = ${phi.toFixed(
    3,
  )} | livello = ${level} | token suggeriti ≈ ${suggestedTokens}.`;

  if (debug?.fromMode) {
    header += `\n• Modalità: ${debug.fromMode}`;
  }
  if (items?.length) {
    const sources = Array.from(
      new Set(
        items
          .map((it) => it.source)
          .filter(Boolean)
          .slice(0, 3),
      ),
    );
    if (sources.length) {
      header += `\n• Fonti principali: ${sources.join(", ")}`;
    }
  }

  const body = ragContext
    .map((chunk, idx) => {
      const short = chunk.length > 800
        ? chunk.slice(0, 800) + "…"
        : chunk;
      return `(${idx + 1}) ${short}`;
    })
    .join("\n\n");

  return `${header}\n\n${body}`.trim();
}
