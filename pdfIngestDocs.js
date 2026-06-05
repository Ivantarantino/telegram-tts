// pdfIngestDocs.js
// Ingest PDF dedicato alla Biblioteca viva di IRIS: iris_docs.
// Non importa index.js, non usa Telegram, non tocca Render.

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const FILEPATH = process.argv.slice(2).join(" ").trim();
const COLLECTION = "iris_docs";
const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_CHUNK_LEN = 1100;
const BATCH_SIZE = 64;

if (!FILEPATH) {
  console.error('Errore: specifica il percorso del PDF. Esempio: node pdfIngestDocs.js "/percorso/al/file.pdf"');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY || !process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
  console.error("Errore: OPENAI_API_KEY, QDRANT_URL e QDRANT_API_KEY devono essere presenti nell'ambiente.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

function splitLongParagraph(paragraph, maxLen) {
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let buffer = "";

  for (const sentence of sentences) {
    const next = (buffer ? `${buffer} ${sentence}` : sentence).trim();

    if (next.length > maxLen) {
      if (buffer.trim()) chunks.push(buffer.trim());

      if (sentence.length > maxLen) {
        for (let i = 0; i < sentence.length; i += maxLen) {
          chunks.push(sentence.slice(i, i + maxLen).trim());
        }
        buffer = "";
      } else {
        buffer = sentence;
      }
    } else {
      buffer = next;
    }
  }

  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks;
}

function splitToChunks(text, maxLen = MAX_CHUNK_LEN) {
  const paragraphs = text
    .replace(/\r/g, "\n")
    .replace(/[^\S\r\n]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxLen) {
      chunks.push(paragraph);
    } else {
      chunks.push(...splitLongParagraph(paragraph, maxLen));
    }
  }

  return chunks;
}

async function ensureCollectionExists() {
  const collections = await qdrant.getCollections();
  const names = collections.collections.map((collection) => collection.name);

  if (!names.includes(COLLECTION)) {
    throw new Error(`Collection ${COLLECTION} non trovata. Creo nulla: verifica prima Qdrant.`);
  }
}

async function upsertBatch(points) {
  if (!points.length) return;
  await qdrant.upsert(COLLECTION, { points });
}

async function main() {
  const absolutePath = path.resolve(FILEPATH);
  const sourceName = path.basename(absolutePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Errore: file non trovato: ${absolutePath}`);
    process.exit(1);
  }

  console.log("IRIS PDF ingest docs");
  console.log("--------------------");
  console.log(`File: ${absolutePath}`);
  console.log(`Collection target: ${COLLECTION}`);
  console.log(`Embedding model: ${EMBEDDING_MODEL}`);
  console.log("");

  try {
    await ensureCollectionExists();

    const dataBuffer = fs.readFileSync(absolutePath);
    const pdf = await pdfParse(dataBuffer);
    const rawText = (pdf.text || "").trim();

    if (!rawText) {
      throw new Error("Testo PDF vuoto o non leggibile.");
    }

    const chunks = splitToChunks(rawText);
    if (!chunks.length) {
      throw new Error("Nessun chunk generato dal PDF.");
    }

    console.log(`Caratteri estratti: ${rawText.length}`);
    console.log(`Chunk generati: ${chunks.length}`);

    let uploaded = 0;
    let batch = [];

    for (const chunk of chunks) {
      const embedding = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: chunk,
      });

      batch.push({
        id: uuidv4(),
        vector: embedding.data[0].embedding,
        payload: {
          text: chunk,
          source: sourceName,
          timestamp: new Date().toISOString(),
          type: "document",
          collectionRole: "rag_docs",
        },
      });

      if (batch.length >= BATCH_SIZE) {
        await upsertBatch(batch);
        uploaded += batch.length;
        console.log(`Upsert batch: ${uploaded}/${chunks.length}`);
        batch = [];
      }
    }

    if (batch.length) {
      await upsertBatch(batch);
      uploaded += batch.length;
      console.log(`Upsert batch finale: ${uploaded}/${chunks.length}`);
    }

    console.log("");
    console.log("Report finale");
    console.log("-------------");
    console.log(`File letto: ${absolutePath}`);
    console.log(`Caratteri estratti: ${rawText.length}`);
    console.log(`Numero chunk: ${chunks.length}`);
    console.log(`Collection target: ${COLLECTION}`);
    console.log(`Modello embedding: ${EMBEDDING_MODEL}`);
    console.log(`Punti caricati: ${uploaded}`);
    console.log("Esito: completato");
  } catch (error) {
    console.error("");
    console.error("Errore ingest PDF in iris_docs:");
    console.error(error?.message || error);
    process.exit(1);
  }
}

main();
