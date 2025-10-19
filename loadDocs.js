import fs from "fs";
import pdfParse from "pdf-parse";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// === CONFIG ===
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "iris-krist";
const FILE_PATH = "./M24 - IL PROGRAMMA KRIST.pdf";

// === FUNZIONE: Assicurarsi che la collection esista ===
async function ensureCollection() {
  const collections = await qdrantClient.getCollections();
  const exists = collections.collections.some(
    (c) => c.name === COLLECTION_NAME
  );

  if (!exists) {
    console.log(`📁 Creazione nuova collection: ${COLLECTION_NAME}`);
    await qdrantClient.createCollection(COLLECTION_NAME, {
      vectors: { size: 1536, distance: "Cosine" },
    });
  } else {
    console.log(`📁 Collection '${COLLECTION_NAME}' già esistente`);
  }
}

// === FUNZIONE: Leggi PDF e genera embedding ===
async function ingestPDF() {
  console.log(`📖 Lettura PDF: ${FILE_PATH}`);
  const dataBuffer = fs.readFileSync(FILE_PATH);
  const pdfData = await pdfParse(dataBuffer);

  const text = pdfData.text.replace(/\s+/g, " ").trim();
  const chunks = [];
  const chunkSize = 2000;

  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  console.log(`🧩 Suddiviso in ${chunks.length} blocchi da ${chunkSize} 
caratteri.`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk,
    });

    const embedding = embeddingResponse.data[0].embedding;

    await qdrantClient.upsert(COLLECTION_NAME, {
      points: [
        {
          id: i + 1,
          vector: embedding,
          payload: {
            source: "M24 - IL PROGRAMMA KRIST",
            chunk_index: i,
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

