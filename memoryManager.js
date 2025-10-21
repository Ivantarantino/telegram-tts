// memoryManager.js — Memoria vettoriale per utente (Qdrant se disponibile, altrimenti in-memory)
const { QdrantClient } = require("@qdrant/js-client-rest");
const { OpenAI } = require("openai");

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let client = null;
let inMemory = new Map(); // fallback: Map<userId, Array<{text, vector}>>

async function ensureClient() {
  if (!QDRANT_URL || !QDRANT_API_KEY) return null;
  if (client) return client;
  client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.find(c => c.name === QDRANT_COLLECTION);
    if (!exists) {
      await client.createCollection(QDRANT_COLLECTION, {
        vectors: { size: 1536, distance: "Cosine" } // OpenAI text-embedding-3-small
      });
    }
  } catch (e) {
    client = null;
  }
  return client;
}

async function embed(text) {
  const r = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return r.data[0].embedding;
}

async function remember(userId, text) {
  const vector = await embed(text);
  const c = await ensureClient();
  if (c) {
    await c.upsert(QDRANT_COLLECTION, {
      points: [{
        id: Date.now(),
        vector,
        payload: { userId, text, ts: new Date().toISOString() }
      }]
    });
    return true;
  } else {
    const arr = inMemory.get(userId) || [];
    arr.push({ text, vector });
    inMemory.set(userId, arr);
    return true;
  }
}

async function recall(userId, query, k = 3) {
  const qv = await embed(query);
  const c = await ensureClient();
  if (c) {
    const res = await c.search(QDRANT_COLLECTION, {
      vector: qv,
      limit: k,
      filter: { must: [{ key: "userId", match: { value: userId } }] }
    });
    return res.map(r => r.payload.text);
  } else {
    const arr = inMemory.get(userId) || [];
    if (arr.length === 0) return [];
    // cosine similarity naive
    const dot = (a,b)=>a.reduce((s,ai,i)=>s+ai*b[i],0);
    const norm = a => Math.sqrt(a.reduce((s,ai)=>s+ai*ai,0));
    const sim = (a,b)=>dot(a,b)/(norm(a)*norm(b)+1e-9);
    return arr
      .map(item => ({ text:item.text, score: sim(qv, item.vector) }))
      .sort((a,b)=>b.score-a.score)
      .slice(0,k)
      .map(x=>x.text);
  }
}

module.exports = { remember, recall };
