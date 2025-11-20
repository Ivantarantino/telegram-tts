// core/essence_kristal.js – COMPLETO
import { QdrantClient } from "@qdrant/js-client-rest";
import { openai } from "../openai.js";
import dotenv from "dotenv";
dotenv.config();

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

export function computePhiKristal(newEmb, essenceVec, recent = []) {
  const essenceSim = cosine(newEmb, essenceVec);
  let recentSim = 0.8;
  if (recent.length > 0) {
    const sims = recent.map(v => cosine(newEmb, v));
    recentSim = sims.reduce((a, b) => a + b, 0) / sims.length;
  }
  const freshness = Math.min(1.0, 1.0 + 0.2 * recent.length);
  const raw = 0.6 * essenceSim + 0.3 * recentSim + 0.1 * freshness;
  return Math.pow(raw, 1.3);
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export async function computeEssenceKristal() {
  try {
    const res = await qdrant.scroll(COLLECTION, {
      limit: 500,
      with_payload: true,
      with_vectors: true
    });

    const points = res.points || [];
    if (points.length === 0) return { vector: null };

    let acc = new Array(1536).fill(0);
    let totalWeight = 0;

    for (const p of points) {
      const v = p.vector;
      const payload = p.payload || {};
      const phi = payload.phi || 0.5;
      const weight = (payload.weight || 1) * phi;

      if (weight > 0 && v) {
        for (let i = 0; i < v.length; i++) acc[i] += v[i] * weight;
        totalWeight += weight;
      }
    }

    if (totalWeight === 0) return { vector: null };

    for (let i = 0; i < acc.length; i++) acc[i] /= totalWeight;

    return { vector: acc };
  } catch (e) {
    console.error("Essence fallita:", e.message);
    return { vector: null };
  }
}
