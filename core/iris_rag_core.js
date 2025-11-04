// core/iris_rag_core.js
// ------------------------------------------------------
// IRIS RAG Core — Memoria vettoriale e conoscenza viva
// ------------------------------------------------------

import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = "iris_memory";

// ------------------------------------------------------
// Inizializza la collezione vettoriale
// ------------------------------------------------------
export async function ensureIrisCollection() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION);

    if (!exists) {
      await qdrant.createCollection(COLLECTION, {
        vectors: { size: 1536, distance: "Cosine" },
      });
      console.log(`🪶 Collezione creata: ${COLLECTION}`);
    } else {
      console.log(`🧠 Collezione ${COLLECTION} trovata.`);
    }
  } catch (err) {
    console.error("❌ Errore creazione collezione Qdrant:", err.message);
  }
}

// ------------------------------------------------------
// Indicizza i file della libreria di IRIS
// ------------------------------------------------------
export async function indexIrisLibrary() {
  const libraryPath = path.join(process.cwd(), "iris_library");
  if (!fs.existsSync(libraryPath)) return;

  const files = fs.readdirSync(libraryPath);
  console.log(`📚 Indicizzazione libreria (${files.length} file)...`);

  for (const file of files) {
    const filePath = path.join(libraryPath, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const embedding = await getEmbedding(content);
    await qdrant.upsert(COLLECTION, {
      points: [{ id: Date.now(), vector: embedding, payload: { text: content, source: file } }],
    });
  }
  console.log("✨ Libreria IRIS indicizzata con successo.");
}

// ------------------------------------------------------
// Recupera il contesto più vicino nel vettore
// ------------------------------------------------------
export async function queryIrisMemory(query) {
  try {
    const embedding = await getEmbedding(query);
    const search = await qdrant.search(COLLECTION, {
      vector: embedding,
      limit: 3,
    });

    if (!search.length) return "Nessuna memoria trovata.";
    const memories = search.map((m) => m.payload.text).join("\n---\n");
    return memories;
  } catch (err) {
    console.error("❌ Errore ricerca RAG:", err.message);
    return "Errore nell'accesso alla memoria.";
  }
}

// ------------------------------------------------------
// Helper per creare embedding da testo
// ------------------------------------------------------
async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}
