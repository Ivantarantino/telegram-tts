import fs from "fs";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

dotenv.config();

// ✅ CONFIGURAZIONE
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: "https://dc817ce9-c243-4a5e-b24a-3eb950c87706.europe-west3-0.gcp.cloud.qdrant.io",
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";
const FILE_PATH = "./M24 - IL PROGRAMMA KRIST.pdf";

// 🔹 Suddivide il testo in blocchi di circa 1000 caratteri
function splitText(text, maxLength = 1000) {
  const chunks = [];
  let current = "";
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if ((current + s).length > maxLength) {
      chunks.push(current.trim());
      current = "";
    }
    current += s + " ";
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// 🔹 Funzione principale
async function ingestPDF() {
  try {
    console.log("📘 Lettura del PDF...");
    const dataBuffer = fs.readFileSync(FILE_PATH);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text.replace(/\s+/g, " ").trim();
    const chunks = splitText(text);

    console.log(`📄 Frammenti estratti: ${chunks.length}`);

    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      vectors.push({
        id: i,
        vector: embedding.data[0].embedding,
        payload: {
          source: "M24 - IL PROGRAMMA KRIST.pdf",
          text: chunk,
        },
      });

      console.log(`✅ Embedding ${i + 1}/${chunks.length}`);
    }

    console.log("🧠 Invio a Qdrant...");
    await qdrant.upsert(COLLECTION, { points: vectors });
    console.log("🚀 Ingestione completata!");
  } catch (error) {
    console.error("❌ Errore durante l'ingestione:", error);
  }
}

ingestPDF();
