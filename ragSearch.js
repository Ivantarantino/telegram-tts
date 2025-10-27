// =====================================================
// ragSearch.js — IRIS 2.9 Rebirth Diagnostic Edition
// =====================================================

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION || "iris_docs";
const TOP_K = 5;
const SCORE_MIN = 0.25;

// Funzioni interne per leggere vari campi del payload
function pickText(pl) {
  return (
    pl?.text ??
    pl?.chunk ??
    pl?.content ??
    pl?.page_text ??
    ""
  );
}
function pickMeta(pl) {
  return {
    title: pl?.title || pl?.document_title || pl?.source_title || null,
    page: pl?.page ?? pl?.page_number ?? null,
    source: pl?.source || pl?.file || pl?.path || null,
  };
}

// Diagnostica grezza
export async function ragSearchRaw(query, k = TOP_K) {
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const vec = emb.data[0].embedding;
    const res = await qdrant.search(COLLECTION, {
      vector: vec,
      limit: k,
      with_payload: true,
    });
    const hits = (res || [])
      .filter(h => (h.score ?? 0) >= SCORE_MIN)
      .map(h => ({
        score: h.score,
        text: pickText(h.payload) || "",
        meta: pickMeta(h.payload),
      }))
      .filter(h => h.text.trim().length > 0);
    return hits;
  } catch (e) {
    console.error("ragSearchRaw error:", e?.message || e);
    return [];
  }
}

// Sintesi per HY/BOOK
export async function ragSearch(query) {
  const hits = await ragSearchRaw(query, TOP_K);
  if (!hits.length) return "— nessun estratto affidabile —";
  const blocks = hits.map((h, i) => {
    const where = [];
    if (h.meta?.title) where.push(h.meta.title);
    if (h.meta?.page != null) where.push(`p.${h.meta.page}`);
    const head = where.length
      ? `<<ESTRATTO ${i + 1} — ${where.join(" · ")}>>`
      : `<<ESTRATTO ${i + 1}>>`;
    return `${head}\n${h.text}`;
  });
  return blocks.join("\n\n");
}
