// core/iris_rag_core.js
// ----------------------------------------------------------
// IRIS · RAG Core 5.1 — collegata a Qdrant
// Da questo punto in poi TUTTO il RAG passa da qui.
// - Usa il motore di risonanza 𝜑 (iris_rag_resonance)
// - Calcola embedding con text-embedding-3-small (1536)
// - Cerca sia nei documenti (PROGRAMMA KRIST, ecc.) sia in iris_memory
// - Ha fallback gentile se Qdrant o OpenAI non sono disponibili
// ----------------------------------------------------------

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { computeResonanceScore } from "./iris_rag_resonance.js";

// ----------------------------------------------------------
// Configurazione di base
// ----------------------------------------------------------

const openaiApiKey = process.env.OPENAI_API_KEY || "";
const qdrantUrl = process.env.QDRANT_URL || "";
const qdrantApiKey = process.env.QDRANT_API_KEY || "";

// Collezioni Qdrant.
// NOTE:
// - MEMORY_COLLECTION: chat esperienziale (quella che abbiamo appena collegato)
// - DOCS_COLLECTION: libri / PDF, incluso "M24 - IL PROGRAMMA KRIST"
const MEMORY_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";
const DOCS_COLLECTION = "iris_docs";

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensioni (match Qdrant)

let qdrantClient = null;
let qdrantReady = false;

// ----------------------------------------------------------
// Helpers interni
// ----------------------------------------------------------

function ensureQdrantClient() {
  if (qdrantClient) return qdrantClient;

  if (!qdrantUrl || !qdrantApiKey) {
    console.warn(
      "⚠️ [IRIS_RAG_CORE] QDRANT_URL o QDRANT_API_KEY mancanti. RAG in modalità stub."
    );
    return null;
  }

  qdrantClient = new QdrantClient({
    url: qdrantUrl,
    apiKey: qdrantApiKey,
  });

  return qdrantClient;
}

async function embedText(text = "") {
  if (!openaiApiKey) {
    console.warn("⚠️ [IRIS_RAG_CORE] OPENAI_API_KEY mancante. Niente embedding, RAG stub.");
    return null;
  }

  const clean = (text || "").trim();
  if (!clean) return null;

  const client = new OpenAI({ apiKey: openaiApiKey });

  const resp = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: clean,
  });

  const vector = resp.data?.[0]?.embedding;
  if (!vector || !Array.isArray(vector)) {
    console.warn("⚠️ [IRIS_RAG_CORE] Embedding vuoto o non valido.");
    return null;
  }

  return vector;
}

// Wrapper per chiamate search con protezione
async function safeSearch(collectionName, vector, limit) {
  const client = ensureQdrantClient();
  if (!client || !qdrantReady) return [];

  try {
    const hits = await client.search(collectionName, {
      vector,
      limit,
      with_payload: true,
    });

    if (!Array.isArray(hits)) return [];

    return hits.map((hit) => ({
      id: hit.id,
      score: hit.score,
      text:
        (hit.payload && (hit.payload.text || hit.payload.content)) ||
        "",
      source: collectionName,
    }));
  } catch (err) {
    console.error(
      `❌ [IRIS_RAG_CORE] Errore in safeSearch('${collectionName}'):`,
      err
    );
    return [];
  }
}

// Fallback locale se Qdrant / embedding non sono disponibili
function stubResults(resonance, limit) {
  return [
    {
      id: "stub-1",
      score: resonance.phi,
      text:
        "Questo è un ricordo fittizio di IRIS. Serve solo a mantenere vivo il flusso mentre allineiamo la memoria vettoriale.",
      source: "stub/local",
    },
  ].slice(0, limit);
}

// ----------------------------------------------------------
// API esportate
// ----------------------------------------------------------

/**
 * Inizializza la connessione a Qdrant.
 * Viene chiamata all'avvio dal resto del sistema.
 */
export async function initMemoryCollection() {
  console.log("🧠 [IRIS_RAG_CORE] initMemoryCollection() avviata.");

  const client = ensureQdrantClient();
  if (!client) {
    qdrantReady = false;
    return {
      ok: false,
      collection: MEMORY_COLLECTION,
      reason: "Qdrant non configurato, RAG in stub.",
    };
  }

  try {
    // Ping leggero per verificare la connessione
    const info = await client.getCollections();
    const names = (info?.collections || []).map((c) => c.name);

    console.log(
      "🧠 [IRIS_RAG_CORE] Collezioni trovate su Qdrant:",
      names.join(", ")
    );

    qdrantReady = true;

    return {
      ok: true,
      collection: MEMORY_COLLECTION,
      availableCollections: names,
    };
  } catch (err) {
    console.error("❌ [IRIS_RAG_CORE] Errore in initMemoryCollection:", err);
    qdrantReady = false;
    return {
      ok: false,
      collection: MEMORY_COLLECTION,
      error: err?.message || "Errore sconosciuto in initMemoryCollection",
    };
  }
}

/**
 * Ricerca "intelligente" che usa il coefficiente 𝜑 per decidere quanto scavare.
 * @param {string} query - ciò che ha scritto/parlato l'utente
 * @param {object} options - { mode, limit, context }
 */
export async function searchMemories(query, options = {}) {
  const { mode = "hy", limit = 5, context = {} } = options;

  // 1. calcolo risonanza (𝜑)
  const resonance = computeResonanceScore({ query, mode, context });

  console.log(
    "🔎 [IRIS_RAG_CORE] Risonanza calcolata:",
    JSON.stringify(resonance, null, 2)
  );

  // 2. Se Qdrant o OpenAI non sono pronti, restiamo in stub
  if (!openaiApiKey || !qdrantUrl || !qdrantApiKey) {
    console.warn(
      "⚠️ [IRIS_RAG_CORE] Config RAG incompleta (OpenAI/Qdrant). Uso stub locale."
    );
    const fakeItems = stubResults(resonance, limit);
    return {
      ok: true,
      phi: resonance.phi,
      level: resonance.level,
      suggestedTokens: resonance.suggestedTokens,
      items: fakeItems,
    };
  }

  // 3. Embedding della query
  let vector = null;
  try {
    vector = await embedText(query);
  } catch (err) {
    console.error("❌ [IRIS_RAG_CORE] Errore in embedText:", err);
  }

  if (!vector) {
    const fakeItems = stubResults(resonance, limit);
    return {
      ok: true,
      phi: resonance.phi,
      level: resonance.level,
      suggestedTokens: resonance.suggestedTokens,
      items: fakeItems,
    };
  }

  // 4. Decidiamo quanto scavare in base a 𝜑
  //    (per ora semplice: più 𝜑 è alto, più risultati dai libri)
  let docsLimit = 2;
  let memLimit = 2;

  if (resonance.level === "deep") {
    docsLimit = 5;
    memLimit = 3;
  } else if (resonance.level === "medium") {
    docsLimit = 4;
    memLimit = 2;
  }

  // Rispettiamo comunque il limite totale richiesto
  const totalDesired = Math.max(limit, 1);
  if (docsLimit + memLimit > totalDesired) {
    memLimit = Math.max(totalDesired - docsLimit, 0);
  }

  // 5. Cerchiamo sia nei documenti (PROGRAMMA KRIST ecc.) sia nella memoria
  let docsResults = [];
  let memResults = [];

  if (docsLimit > 0) {
    docsResults = await safeSearch(DOCS_COLLECTION, vector, docsLimit);
  }

  if (memLimit > 0) {
    memResults = await safeSearch(MEMORY_COLLECTION, vector, memLimit);
  }

  // 6. Combiniamo, ordiniamo per score e tagliamo al limite
  const combined = [...docsResults, ...memResults]
    .filter((it) => it && it.text && it.text.trim())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, totalDesired);

  // Se per qualche motivo non c'è niente, usiamo comunque lo stub
  const finalItems = combined.length > 0 ? combined : stubResults(resonance, limit);

  return {
    ok: true,
    phi: resonance.phi,
    level: resonance.level,
    suggestedTokens: resonance.suggestedTokens,
    items: finalItems,
  };
}

/**
 * Helper rapido per quando lo user digita /book o una query lunga.
 * Il tuo adapters/telegram_bot.js importa questa funzione.
 */
export async function ragAnswerFromQuery(query, options = {}) {
  const res = await searchMemories(query, options);

  // generiamo una bozza di risposta già pronta per il Cuore
  const header =
    res.level === "deep"
      ? "📚 Ho sentito che questa richiesta merita profondità.\n"
      : "📘 Ti porto ciò che ho trovato.\n";

  const body = res.items
    .map((it) => {
      const sourceLabel =
        it.source === DOCS_COLLECTION
          ? "📖 Documento"
          : it.source === MEMORY_COLLECTION
          ? "🧠 Ricordo"
          : "✨ Fonte";

      return `${sourceLabel}: ${it.text}`;
    })
    .join("\n\n");

  return {
    ...res,
    text: header + body,
  };
}
