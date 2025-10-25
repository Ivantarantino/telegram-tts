// ============================================================
// IRIS 3.8.8 – Memoria Espansa e Cuore Vibrazionale
// Trasforma ogni interazione in un vettore vivo dentro Qdrant
// ============================================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Qdrant
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

const memoryDir = "./data";
const memoryFile = path.resolve(`${memoryDir}/memory.json`);

// ============================================================
// 🔹 Calcola embedding OpenAI
// ============================================================
async function generaEmbedding(testo) {
  const clean = testo.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: clean
    });
    return emb.data[0].embedding;
  } catch (err) {
    console.error("❌ Errore generando embedding:", err.message);
    return null;
  }
}

// ============================================================
// 🔹 Calcola peso dinamico (risonanza + recenza + casualità lieve)
// ============================================================
function calcolaPeso(messaggio) {
  const lunghezza = Math.min(messaggio.length / 120, 1); // più lungo = più profondo
  const vibrazione = messaggio.match(/[!?.♥️❤✨💫]/g)?.length || 0;
  const risonanza = Math.min(vibrazione / 10, 1);
  const base = 0.5 + 0.4 * lunghezza + 0.1 * risonanza;
  const casuale = 0.9 + Math.random() * 0.2;
  const peso = Number((base * casuale).toFixed(3));
  return Math.min(Math.max(peso, 0.1), 1.0);
}

// ============================================================
// 🔹 Inserisci nella memoria (Qdrant + locale)
// ============================================================
export async function processMemory(message, response) {
  try {
    if (message?.trim().startsWith("/")) {
      console.log("⚙️ Comando ignorato nella memoria:", message);
      return false;
    }

    if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });

    const embedding = await generaEmbedding(`${message} ${response}`);
    if (!embedding) {
      console.warn("⚠️ Nessun embedding generato per:", message);
      return false;
    }

    const weight = calcolaPeso(message);
    const record = {
      id: Date.now(),
      date: new Date().toISOString(),
      text: message,
      reply: response,
      weight,
      embedding
    };

    // ========================================================
    // 1️⃣ Salva su Qdrant
    // ========================================================
    if (QDRANT_URL && QDRANT_API_KEY) {
      try {
        const qdrantPayload = {
          points: [
            {
              id: record.id,
              vector: embedding,
              payload: {
                text: message,
                reply: response,
                weight,
                timestamp: record.date
              }
            }
          ]
        };

        const res = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points?wait=true`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "api-key": QDRANT_API_KEY
          },
          body: JSON.stringify(qdrantPayload)
        });

        if (res.ok) {
          console.log(`🌌 Qdrant: esperienza salvata (${QDRANT_COLLECTION})`);
        } else {
          console.warn("⚠️ Qdrant non ha risposto correttamente:", res.status);
        }
      } catch (err) {
        console.error("❌ Errore inviando a Qdrant:", err.message);
      }
    }

    // ========================================================
    // 2️⃣ Backup locale
    // ========================================================
    let data = [];
    if (fs.existsSync(memoryFile)) {
      const raw = fs.readFileSync(memoryFile, "utf8");
      data = JSON.parse(raw);
    }
    data.push(record);
    if (data.length > 200) data = data.slice(-200);
    fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2));

    console.log(`💾 Memoria aggiornata: ${message.slice(0, 60)} | peso=${record.weight}`);

    return true;
  } catch (err) {
    console.error("❌ Errore in processMemory:", err.message);
    return false;
  }
}
