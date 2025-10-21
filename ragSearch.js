// ragSearch.js — Ricerca semantica su Qdrant (documenti globali, non per-utente)
const { QdrantClient } = require("@qdrant/js-client-rest");
const { OpenAI } = require("openai");

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION = process.env.RAG_COLLECTION || "iris_kb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let client = null;

async function ensureClient() {
  if (!QDRANT_URL || !QDRANT_API_KEY) return null;
  if (client) return client;
  client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });
  return client;
}

async function embed(text) {
  const r = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return r.data[0].embedding;
}

async function searchRAG(query, k = 4) {
  const c = await ensureClient();
  if (!c) return [];
  const qv = await embed(query);
  try {
    const res = await c.search(COLLECTION, { vector: qv, limit: k });
    return res.map(r => r.payload?.text || "").filter(Boolean);
  } catch (e) {
    return [];
  }
}

module.exports = { searchRAG };
