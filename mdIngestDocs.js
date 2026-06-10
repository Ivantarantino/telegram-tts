// mdIngestDocs.js
// Ingest Markdown dedicato alla Biblioteca viva di IRIS: iris_docs.
// Non importa index.js, non usa Telegram, non tocca Render.

import fs from "fs";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import dotenv from "dotenv";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const INPUT_DIR = "/Users/ivano/Desktop/IRIS_BIBLIOTECA_INPUT";
const COLLECTION = "iris_docs";
const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_CHUNK_LEN = 1100;
const BATCH_SIZE = 64;
const INGEST_REGISTRY_PATH = path.join(INPUT_DIR, "REGISTRO_INGEST.md");

const args = process.argv.slice(2);
const yesFlag = args.includes("--yes");
const fileArg = args.filter((arg) => arg !== "--yes").join(" ").trim();

if (!fileArg) {
  console.error('Errore: specifica un file Markdown. Esempio: npm run ingest:md -- "/percorso/file.md"');
  process.exit(1);
}

function resolveMarkdownPath(value) {
  if (path.isAbsolute(value)) return value;
  return path.join(INPUT_DIR, value);
}

function titleFromFilename(filename) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMetadata(sourceName) {
  if (sourceName.includes("SATURN_LIZ_GREENE_ROBERT_HAND_2011")) {
    return {
      title: "Saturn: A New Look at an Old Devil",
      author: "Liz Greene",
      foreword: "Robert Hand",
      language: "en",
    };
  }

  return {
    title: titleFromFilename(sourceName),
    language: "unknown",
  };
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

async function askConfirmation() {
  if (yesFlag) return true;

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question("Procedere con ingest Markdown in iris_docs? Scrivi YES per confermare: ");
  rl.close();

  return answer.trim() === "YES";
}

async function upsertBatch(qdrant, points) {
  if (!points.length) return;
  await qdrant.upsert(COLLECTION, { points });
}

function appendIngestRegistryEntry({
  title,
  author,
  foreword,
  language,
  sourceName,
  absolutePath,
  chunksCount,
  uploaded,
}) {
  const timestamp = new Date().toISOString();
  const entry = [
    `## ${title}`,
    "",
    `* Data ingest: ${timestamp}`,
    `* Source file: ${sourceName}`,
    `* Path: ${absolutePath}`,
    "* Tipo: markdown",
    `* Lingua: ${language}`,
    `* Autore: ${author || "n/d"}`,
    `* Foreword: ${foreword || "n/d"}`,
    `* Collection Qdrant: ${COLLECTION}`,
    `* Modello embedding: ${EMBEDDING_MODEL}`,
    `* Chunk caricati: ${chunksCount}`,
    `* Punti caricati: ${uploaded}`,
    "* Stato: completato",
    "",
    "---",
    "",
  ].join("\n");

  try {
    if (!fs.existsSync(INGEST_REGISTRY_PATH)) {
      fs.writeFileSync(INGEST_REGISTRY_PATH, "# Registro Ingest IRIS\n\n", "utf8");
    }

    fs.appendFileSync(INGEST_REGISTRY_PATH, entry, "utf8");
    console.log(`Registro aggiornato: ${INGEST_REGISTRY_PATH}`);
  } catch (error) {
    console.warn("Warning: Qdrant è stato scritto, ma il registro ingest non è stato aggiornato.");
    console.warn(`Registro non scrivibile: ${INGEST_REGISTRY_PATH}`);
    console.warn(error?.message || error);
  }
}

async function main() {
  const absolutePath = path.resolve(resolveMarkdownPath(fileArg));
  const sourceName = path.basename(absolutePath);

  if (!absolutePath.startsWith(`${INPUT_DIR}${path.sep}`)) {
    console.error(`Errore: il file deve stare nella cartella input: ${INPUT_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(absolutePath)) {
    console.error(`Errore: file non trovato: ${absolutePath}`);
    process.exit(1);
  }

  if (path.extname(absolutePath).toLowerCase() !== ".md") {
    console.error("Errore: sono supportati solo file Markdown con estensione .md.");
    process.exit(1);
  }

  const markdown = fs.readFileSync(absolutePath, "utf8").trim();
  if (!markdown) {
    console.error("Errore: file Markdown vuoto.");
    process.exit(1);
  }

  const chunks = splitToChunks(markdown);
  if (!chunks.length) {
    console.error("Errore: nessun chunk generato dal Markdown.");
    process.exit(1);
  }

  const metadata = getMetadata(sourceName);

  console.log("IRIS Markdown ingest docs");
  console.log("-------------------------");
  console.log(`File: ${absolutePath}`);
  console.log(`Dimensione file: ${fs.statSync(absolutePath).size} byte`);
  console.log(`Caratteri: ${markdown.length}`);
  console.log(`Chunk stimati: ${chunks.length}`);
  console.log(`Collection target: ${COLLECTION}`);
  console.log(`Embedding model: ${EMBEDDING_MODEL}`);
  console.log(`Titolo: ${metadata.title}`);
  if (metadata.author) console.log(`Autore: ${metadata.author}`);
  if (metadata.foreword) console.log(`Foreword: ${metadata.foreword}`);
  console.log(`Lingua: ${metadata.language}`);
  console.log("");

  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log("Ingest annullato. Nessun dato scritto su Qdrant.");
    return;
  }

  validateIngestEnv();
  const { openai, qdrant } = createClients();

  try {
    await ensureCollectionExists(qdrant);

    let uploaded = 0;
    let batch = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const embedding = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: chunk,
      });

      batch.push({
        id: uuidv4(),
        vector: embedding.data[0].embedding,
        payload: {
          source: sourceName,
          title: metadata.title,
          author: metadata.author,
          foreword: metadata.foreword,
          language: metadata.language,
          type: "markdown",
          chunk_index: index,
          text: chunk,
          created_at: new Date().toISOString(),
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
    console.log(`Numero chunk: ${chunks.length}`);
    console.log(`Collection target: ${COLLECTION}`);
    console.log(`Modello embedding: ${EMBEDDING_MODEL}`);
    console.log(`Punti caricati: ${uploaded}`);
    console.log("Esito: completato");

    appendIngestRegistryEntry({
      title: metadata.title,
      author: metadata.author,
      foreword: metadata.foreword,
      language: metadata.language,
      sourceName,
      absolutePath,
      chunksCount: chunks.length,
      uploaded,
    });
  } catch (error) {
    console.error("");
    console.error("Errore ingest Markdown in iris_docs:");
    console.error(error?.message || error);
    process.exit(1);
  }
}

main();
