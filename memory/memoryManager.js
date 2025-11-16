import fs from "fs";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

// ----------------------------------------
// Percorso memoria locale (fallback 4.7)
// ----------------------------------------
const MEMORY_PATH = "./memory/memory.json";

// ----------------------------------------
// Env & client esterni
// ----------------------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const QDRANT_URL = process.env.QDRANT_URL || "";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

// Client OpenAI (embedding)
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Client Qdrant
const qdrant =
  QDRANT_URL && QDRANT_API_KEY
    ? new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY })
    : null;

// Stato interno per non ricreare la collection ogni volta
let collectionReady = false;

// ----------------------------------------
// Utility: append su file locale
// ----------------------------------------
function appendLocalMemory(entry) {
  try {
    let history = [];
    if (fs.existsSync(MEMORY_PATH)) {
      history = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
      if (!Array.isArray(history)) {
        history = [];
      }
    }
    history.push(entry);
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error("❌ [IRIS_MEMORY] Errore salvataggio memory.json:", err);
  }
}

// ----------------------------------------
// Ensure Qdrant collection `iris_memory`
// (se esiste → ok, se non esiste → crea)
// ----------------------------------------
async function ensureCollection(dimension) {
  if (!qdrant) return false;

  if (collectionReady) {
    return true;
  }

  try {
    // Se la collection esiste, basta questo
    await qdrant.getCollection(QDRANT_COLLECTION);
    collectionReady = true;
    console.log(
      `🧠 [IRIS_MEMORY] Collection '${QDRANT_COLLECTION}' trovata e pronta.`
    );
    return true;
  } catch (err) {
    // Se non esiste, la creiamo con la dimensione che usiamo ora
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
      console.error(
        "❌ [IRIS_MEMORY] Impossibile creare la collection Qdrant:",
        inner
      );
      return false;
    }
  }
}

// ----------------------------------------
// API principale: processMemory
// Salva cronologia locale + vettori in Qdrant
// ----------------------------------------
export async function processMemory(userText, irisReply) {
  const timestamp = new Date().toISOString();

  // 1) Sempre: salvataggio cronologico locale (retrocompatibile)
  const entry = {
    time: timestamp,
    userText,
    irisReply,
  };
  appendLocalMemory(entry);

  // 2) Se OpenAI o Qdrant non sono configurati → ci fermiamo al locale
  if (!openai || !qdrant) {
    console.log(
      "[IRIS_MEMORY] Qdrant/OpenAI non configurati → uso solo memoria locale."
    );
    return false;
  }

  try {
    // Normalizza i testi e crea coppia user/iris
    const texts = [];
    if (userText && userText.trim()) {
      texts.push({ role: "user", text: userText.trim() });
    }
    if (irisReply && irisReply.trim()) {
      texts.push({ role: "iris", text: irisReply.trim() });
    }

    if (texts.length === 0) {
      return false;
    }

    const cleanInputs = texts.map((t) =>
      t.text.replace(/\s+/g, " ").trim()
    );

    // 3) Embeddings OpenAI (uno per ogni messaggio del pair)
    //    Usiamo text-embedding-3-large → 1536 dimensioni
    const embResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: cleanInputs,
    });

    const embeddings = embResponse.data.map((d) => d.embedding);
    if (!embeddings.length || !embeddings[0]?.length) {
      console.warn("[IRIS_MEMORY] Nessun embedding valido generato.");
      return false;
    }

    const dim = embeddings[0].length;

    // 4) Assicura che la collection esista
    const ok = await ensureCollection(dim);
    if (!ok) {
      return false;
    }

    // 5) Prepara punti Qdrant (user + iris) con peso base e timestamp
    const nowMs = Date.now();
    const points = embeddings.map((vector, idx) => {
      const t = texts[idx];
      return {
        id: `${nowMs}-${idx}`, // ID semplice ma unico nel tempo
        vector,
        payload: {
          text: t.text,
          role: t.role, // "user" | "iris"
          pairTimestamp: timestamp,
          createdAt: timestamp,
          weight: 1.0, // peso base — per ora recenza gestita via tempo
          source: "chat",
        },
      };
    });

    // 6) Upsert in Qdrant
    await qdrant.upsert(QDRANT_COLLECTION, { points });
    console.log(
      `🧠 [IRIS_MEMORY] Salvati ${points.length} punti in Qdrant (${QDRANT_COLLECTION}).`
    );

    return true;
  } catch (err) {
    console.error("❌ [IRIS_MEMORY] Errore in processMemory (Qdrant):", err);
    return false;
  }
}
