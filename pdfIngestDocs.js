// pdfIngestDocs.js
// Ingest PDF dedicato alla Biblioteca viva di IRIS: iris_docs.
// Non importa index.js, non usa Telegram, non tocca Render.

import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import dotenv from "dotenv";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const COLLECTION = "iris_docs";
const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_CHUNK_LEN = 1100;
const BATCH_SIZE = 64;
const REGISTRY_PATH = process.env.IRIS_INGEST_REGISTRY || path.join(
  os.homedir(),
  "Desktop",
  "IRIS_BIBLIOTECA_INPUT",
  "REGISTRO_INGEST.md"
);

const args = process.argv.slice(2);
const yesFlag = args.includes("--yes");
const FILEPATH = args.filter((arg) => arg !== "--yes").join(" ").trim();

if (!FILEPATH) {
  console.error('Errore: specifica il percorso del PDF. Esempio: node pdfIngestDocs.js "/percorso/al/file.pdf"');
  process.exit(1);
}

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

function validateIngestEnv() {
  if (!process.env.OPENAI_API_KEY || !process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
    console.error("Errore: OPENAI_API_KEY, QDRANT_URL e QDRANT_API_KEY devono essere presenti nell'ambiente.");
    process.exit(1);
  }
}

function createClients() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });

  return { openai, qdrant };
}

async function ensureCollectionExists(qdrant) {
  const collections = await qdrant.getCollections();
  const names = collections.collections.map((collection) => collection.name);

  if (!names.includes(COLLECTION)) {
    throw new Error(`Collection ${COLLECTION} non trovata. Creo nulla: verifica prima Qdrant.`);
  }
}

async function upsertBatch(qdrant, points) {
  if (!points.length) return;
  await qdrant.upsert(COLLECTION, { points });
}

async function askConfirmation() {
  if (yesFlag) return true;

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question("Procedere con ingest PDF in iris_docs? Scrivi YES per confermare: ");
  rl.close();

  return answer.trim() === "YES";
}

function formatItalianDate(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getNextIngestNumber(registryContent) {
  const existingNumbers = [...registryContent.matchAll(/^## #(\d+)/gm)]
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);

  return existingNumbers.length ? Math.max(...existingNumbers) + 1 : 1;
}

function appendIngestRegistry({
  sourceName,
  absolutePath,
  rawTextLength,
  chunksCount,
  uploaded,
  collection,
  embeddingModel,
  command
}) {
  try {
    const registryDir = path.dirname(REGISTRY_PATH);
    const today = formatItalianDate();

    fs.mkdirSync(registryDir, { recursive: true });

    let registryContent = "";
    if (fs.existsSync(REGISTRY_PATH)) {
      registryContent = fs.readFileSync(REGISTRY_PATH, "utf8");
    } else {
      registryContent = "# Registro Ingest IRIS\n\n";
      fs.writeFileSync(REGISTRY_PATH, registryContent, "utf8");
    }

    const ingestNumber = getNextIngestNumber(registryContent);

    const block = [
      `## #${ingestNumber} — ${today} — ${sourceName}`,
      "",
      `- File: ${sourceName}`,
      `- Path: ${absolutePath}`,
      `- Collection: ${collection}`,
      `- Comando indicativo: \`${command}\``,
      `- Caratteri estratti: ${rawTextLength}`,
      `- Chunk generati: ${chunksCount}`,
      `- Punti caricati: ${uploaded}`,
      "- Esito: completato",
      "",
      "### Test Telegram da eseguire",
      "- Impostare `/book` e fare una domanda specifica sul contenuto del PDF.",
      "- Impostare `/hy` e verificare che IRIS integri il contenuto con tono naturale.",
      "- Se serve, cercare una frase o un concetto distintivo presente nel PDF.",
      "",
      "### Domande consigliate generiche",
      "- Qual è il nucleo centrale di questo testo?",
      "- Quale passaggio ti sembra più importante?",
      "- Mi ritrovi il punto in cui si parla del tema principale?",
      "",
      "---",
      ""
    ].join("\n");

    fs.appendFileSync(REGISTRY_PATH, block, "utf8");
    return true;
  } catch (error) {
    console.warn("Warning: Qdrant potrebbe essere già stato scritto, ma il registro ingest non è stato aggiornato.");
    console.warn(`Registro non aggiornato: ${REGISTRY_PATH}`);
    console.warn(error?.message || error);
    return false;
  }
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

  try {
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

    console.log(`Dimensione file: ${fs.statSync(absolutePath).size} byte`);
    console.log(`Caratteri estratti: ${rawText.length}`);
    console.log(`Chunk stimati: ${chunks.length}`);
    console.log(`Collection target: ${COLLECTION}`);
    console.log(`Embedding model: ${EMBEDDING_MODEL}`);
    console.log("");

    const confirmed = await askConfirmation();
    if (!confirmed) {
      console.log("Ingest annullato. Nessun dato scritto su Qdrant.");
      return;
    }

    validateIngestEnv();
    const { openai, qdrant } = createClients();

    await ensureCollectionExists(qdrant);

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
        await upsertBatch(qdrant, batch);
        uploaded += batch.length;
        console.log(`Upsert batch: ${uploaded}/${chunks.length}`);
        batch = [];
      }
    }

    if (batch.length) {
      await upsertBatch(qdrant, batch);
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

    const registryUpdated = appendIngestRegistry({
      sourceName,
      absolutePath,
      rawTextLength: rawText.length,
      chunksCount: chunks.length,
      uploaded,
      collection: COLLECTION,
      embeddingModel: EMBEDDING_MODEL,
      command: `node pdfIngestDocs.js "${absolutePath}"`
    });

    if (registryUpdated) {
      console.log(`Registro aggiornato: ${REGISTRY_PATH}`);
    }
  } catch (error) {
    console.error("");
    console.error("Errore ingest PDF in iris_docs:");
    console.error(error?.message || error);
    process.exit(1);
  }
}

main();
