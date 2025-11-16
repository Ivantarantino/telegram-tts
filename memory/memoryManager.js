import fs from "fs";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

// ----------------------------------------
const MEMORY_PATH = "./memory/memory.json";
// ----------------------------------------

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const QDRANT_URL = process.env.QDRANT_URL || "";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const qdrant =
  QDRANT_URL && QDRANT_API_KEY
    ? new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY })
    : null;

let collectionReady = false;

// ----------------------------------------
function appendLocalMemory(entry) {
  try {
    let history = [];
    if (fs.existsSync(MEMORY_PATH)) {
      history = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
      if (!Array.isArray(history)) history = [];
    }
    history.push(entry);
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error("❌ [IRIS_MEMORY] Errore salvataggio memory.json:", err);
  }
}
// ----------------------------------------

async function ensureCollection(dimension) {
  if (!qdrant) return false;

  if (collectionReady) return true;

  try {
    await qdrant.getCollection(QDRANT_COLLECTION);
    collectionReady = true;
    console.log(`🧠 [IRIS_MEMORY] Collection '${QDRANT_COLLECTION}' trovata e pronta.`);
    return true;
  } catch (err) {
    try {
      await qdrant.createCollection(QDRANT_COLLECTION, {
        vectors: {
          size: dimension,
          distance: "Cosine",
        },
      });
      collectionReady = true;
      console.log(
        `🧠 [IRIS_MEMORY] Collection '${QDRANT_COLLECTION}' creata (size=${dimension}).`
      );
      return true;
    } catch (inner) {
      console.error("❌ [IRIS_MEMORY] Errore creazione collection:", inner);
      return false;
    }
  }
}

// ----------------------------------------
export async function processMemory(userText, irisReply) {
  const timestamp = new Date().toISOString();

  appendLocalMemory({ time: timestamp, userText, irisReply });

  if (!openai || !qdrant) {
    console.log("[IRIS_MEMORY] Solo memoria locale (manca OpenAI/Qdrant).");
    return false;
  }

  try {
    const texts = [];
    if (userText?.trim()) texts.push({ role: "user", text: userText.trim() });
    if (irisReply?.trim()) texts.push({ role: "iris", text: irisReply.trim() });

    if (texts.length === 0) return false;

    const cleanInputs = texts.map((t) => t.text.replace(/\s+/g, " ").trim());

    const embResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: cleanInputs,
    });

    const embeddings = embResponse.data.map((d) => d.embedding);
    if (!embeddings.length) {
      console.warn("[IRIS_MEMORY] Nessun embedding generato.");
      return false;
    }

    const dim = embeddings[0].length;
    const ok = await ensureCollection(dim);
    if (!ok) return false;

    const nowMs = Date.now();

    const points = embeddings.map((vector, idx) => ({
      id: Number(nowMs + idx),    // <-- FIX: ID numerico valido
      vector,
      payload: {
        text: texts[idx].text,
        role: texts[idx].role,
        pairTimestamp: timestamp,
        createdAt: timestamp,
        weight: 1.0,
        source: "chat",
      },
    }));

    await qdrant.upsert(QDRANT_COLLECTION, { points });

    console.log(
      `🧠 [IRIS_MEMORY] Salvati ${points.length} punti in Qdrant (${QDRANT_COLLECTION}).`
    );

    return true;
  } catch (err) {
    console.error("❌ [IRIS_MEMORY] Errore in processMemory:", err);
    return false;
  }
}
