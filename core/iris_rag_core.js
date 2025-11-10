// core/iris_rag_core.js — IRIS 5.1 RAG Core (Qdrant + Fallback JSON)
// =============================================================================
// Gestisce init collection e searchMemories. Check input vuoto per evitare 400.
// =============================================================================

import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MEMORY_PATH = './memory/memory.json';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

// Client Qdrant
let qdrantClient;
async function initQdrant() {
  try {
    qdrantClient = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });
    await qdrantClient.createCollection('iris_memory', {
      vectors: { size: 1536, distance: 'Cosine' }  // OpenAI embedding dim
    });
    console.log('🧠 Qdrant collection "iris_memory" inizializzata.');
    return true;
  } catch (err) {
    console.warn('⚠️ Qdrant non disponibile, fallback a JSON:', err.message);
    return false;
  }
}

// Embed text con OpenAI — Check input
async function embedText(text) {
  if (!text || text.trim() === '') {
    console.log('🧹 Input vuoto per embedding: salto.');
    return null;  // O vettore zero, ma qui skip
  }
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.trim()
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error('❌ Errore embedding:', err.message);
    return null;
  }
}

// Init memoria (Qdrant o JSON)
export async function initMemoryCollection() {
  const qdrantOk = await initQdrant();
  if (!qdrantOk) {
    // Fallback: crea/aggiorna memory.json
    if (!fs.existsSync(MEMORY_PATH)) {
      fs.writeFileSync(MEMORY_PATH, JSON.stringify([], null, 2));
    }
    console.log('📝 Fallback memoria JSON attiva.');
  }
}

// Search memories (con topK=5, restituisce testi + scores) — Skip se query vuota
export async function searchMemories(query, { mode = 'hy', topK = 5 } = {}) {
  if (!query || query.trim() === '') {
    console.log('🧹 Query vuota per search: restituisco [].');
    return [];
  }
  try {
    const queryEmbedding = await embedText(query);
    if (!queryEmbedding) return [];  // Skip se embedding fallito
    
    if (qdrantClient) {
      // Qdrant search
      const results = await qdrantClient.search('iris_memory', {
        vector: queryEmbedding,
        limit: topK
      });
      return results.map(r => ({
        text: r.payload.text,
        score: r.score  // Cosine sim
      }));
    } else {
      // Fallback JSON
      const history = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
      if (history.length === 0) return [];
      
      // Embed solo testi validi
      const validHistory = history.filter(h => h.irisReply || h.userText);
      if (validHistory.length === 0) return [];
      
      const embeddings = await Promise.all(validHistory.map(h => embedText(h.irisReply || h.userText)));
      const validEmbeds = embeddings.filter(e => e !== null);
      if (validEmbeds.length === 0) return [];
      
      const scores = validEmbeds.map((emb, i) => ({
        cosine: cosineSimilarity(queryEmbedding, emb),
        index: i
      })).sort((a, b) => b.cosine - a.cosine).slice(0, topK);
      
      return scores.map(s => ({
        text: validHistory[s.index].irisReply || validHistory[s.index].userText,
        score: s.cosine
      }));
    }
  } catch (err) {
    console.error('❌ Errore searchMemories:', err);
    return [];
  }
}

// Cosine similarity helper
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB || 1);  // Evita div/0
}

// Salva nuova memoria (post-interazione) — Skip se vuoto
export async function saveMemory(userText, irisReply, weight = 0.5) {
  if (!userText || !irisReply || userText.trim() === '' || irisReply.trim() === '') {
    console.log('🧹 Memoria vuota: non salvata.');
    return;
  }
  const embedding = await embedText(`${userText} | ${irisReply}`);
  if (!embedding) return;
  
  const payload = { text: `${userText} | ${irisReply}`, weight };
  
  if (qdrantClient) {
    await qdrantClient.upsert('iris_memory', {
      points: [{ id: Date.now(), vector: embedding, payload }]
    });
  } else {
    // Fallback: append a JSON
    let history = [];
    if (fs.existsSync(MEMORY_PATH)) {
      history = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    }
    history.push({ ...payload, time: new Date().toISOString() });
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(history, null, 2));
  }
  console.log('💾 Memoria salvata con weight:', weight);
}
