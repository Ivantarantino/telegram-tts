// loadDocs.js — Carica M24 - IL PROGRAMMA KRIST.pdf in Qdrant Cloud

import fs from "fs";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { createRequire } from "module";

// ✅ Usa require solo per pdf-parse
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// === CONFIG ===
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION_NAME = "iris_docs";
const FILE_PATH = "M24 - IL PROGRAMMA KRIST.pdf";

// === CLIENTS ===
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

// === FUNZIONI ===

// Divide il testo in blocchi di max 1500 caratteri
function splitText(text, maxLen = 1500) {
  const paragraphs = text
    .replace(/\n\s*\n/g, "\n\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + p).length < maxLen) current += p + "\n\n";
    else {
      chunks.push(current.trim());
      current = p + "\n\n";
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

// Crea la collection se non esiste
async function ensureCollection() {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(
    (c) => c.name === COLLECTION_NAME
  );
  if (exists) {
    console.log(`📚 Collection '${COLLECTION_NAME}' già esistente.`);
    return;
  }

  console.log(`🆕 Creazione collection '${COLLECTION_NAME}'...`);
  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: { size: 1536, distance: "Cosine" },
  });
  console.log("✅ Collection creata!");
}

// Lettura PDF (funzionale con require)
async function readPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  return pdfParse(dataBuffer); // ✅ questa è una funzione valida
}

// Carica il PDF e invia i blocchi in Qdrant
async function ingestPDF() {
  console.log(`📖 Lettura file: ${FILE_PATH}`);
  const data = await readPDF(FILE_PATH);
  const chunks = splitText(data.text);
  console.log(`✂️ Frammenti estratti: ${chunks.length}`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk,
    });

    const vector = embedding.data[0].embedding;

    await qdrant.upsert(COLLECTION_NAME, {
      points: [
        {
          id: i + 1,
          vector,
          payload: {
            source: "M24 - IL PROGRAMMA KRIST",
            text: chunk,
          },
        },
      ],
    });

    console.log(`✅ Blocco ${i + 1}/${chunks.length} caricato`);
  }

  console.log("🎯 Importazione completata!");
}

// === MAIN ===
(async () => {
  try {
    await ensureCollection();
    await ingestPDF();
    console.log("✨ Tutto pronto: IRIS ora conosce il Programma KRIST.");
  } catch (err) {
    console.error("❌ Errore durante l'import:", err);
  }
})();
