// ragSearch.js — IRIS 3.9.1
import { QdrantClient } from "@qdrant/js-client-rest";
import pdfParse from "pdf-parse";
import fs from "fs";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_KEY = process.env.QDRANT_KEY;
const COLLECTION = process.env.QDRANT_COLLECTION || "iris_docs";
const MEM_COLLECTION = process.env.QDRANT_MEMORY || "iris_memory";

const client = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_KEY
});

async function ensureCollection(name, size=1536) {
  try {
    await client.getCollection(name);
  } catch {
    await client.createCollection(name, {
      vectors: { size, distance: "Cosine" }
    });
  }
}

// Dummy embedder: usa text-embedding-3-small via OpenAI
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function embed(texts) {
  const { data } = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts
  });
  return data.map(d => d.embedding);
}

// -----------------------------------------
// SEARCH (RAG) — usato in HY/books
// -----------------------------------------
export async function ragSearch(query, { topK=5 } = {}) {
  await ensureCollection(COLLECTION);
  const [qvec] = await embed([query]);
  const res = await client.search(COLLECTION, {
    vector: qvec,
    limit: topK,
    with_payload: true
  });
  if (!res || !res.length) return "";
  const out = res
    .map((p, i) => `#${i+1} (score ${p.score?.toFixed(3)})\n${p.payload?.text || ""}`)
    .join("\n\n");
  return out;
}

// -----------------------------------------
// INGEST PDF — chiamata da index su upload
// -----------------------------------------
export async function ingestPdf(filePath, { chunk=900, overlap=150 } = {}) {
  await ensureCollection(COLLECTION);
  const buf = fs.readFileSync(filePath);
  const pdf = await pdfParse(buf);
  const text = (pdf.text || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return { pages: 0, chunks: 0 };

  // chunking semplice
  const chunks = [];
  for (let i=0; i<text.length; i += (chunk - overlap)) {
    chunks.push(text.slice(i, i + chunk));
  }
  const embeds = await embed(chunks);

  const points = embeds.map((vec, i) => ({
    id: Date.now() + i,
    vector: vec,
    payload: { text: chunks[i] }
  }));

  await client.upsert(COLLECTION, { points });
  return { pages: pdf.numpages || 0, chunks: chunks.length };
}
