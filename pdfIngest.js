// ===============================
// pdfIngest.js — IRIS 2.6.5d
// Ingestione PDF → blocchi → embeddings → Qdrant (iris_memory)
// Uso: node pdfIngest.js "/path/Il Codice Krist.pdf"
// ===============================

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

const FILEPATH = process.argv.slice(2).join(" ").trim();
if (!FILEPATH) {
  console.error("❌ Specifica il percorso del PDF: es.  node pdfIngest.js \"/path/Il Codice Krist.pdf\"");
  process.exit(1);
}

const COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

function splitToParagraphs(text, maxLen = 900) {
  const paras = text
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean);

  const chunks = [];
  for (const p of paras) {
    if (p.length <= maxLen) {
      chunks.push(p);
    } else {
      // soft split su frasi
      const sentences = p.split(/(?<=[\.\!\?])\s+/);
      let buf = "";
      for (const s of sentences) {
        if ((buf + " " + s).trim().length > maxLen) {
          if (buf.trim()) chunks.push(buf.trim());
          buf = s;
        } else {
          buf = (buf ? buf + " " : "") + s;
        }
      }
      if (buf.trim()) chunks.push(buf.trim());
    }
  }
  return chunks;
}

async function main() {
  console.log(`📥 Lettura PDF: ${FILEPATH}`);
  const dataBuffer = fs.readFileSync(FILEPATH);
  const pdf = await pdfParse(dataBuffer);
  const raw = (pdf.text || "").trim();
  if (!raw) {
    console.error("❌ Testo PDF vuoto/non leggibile.");
    process.exit(1);
  }

  // Pulizia leggera (potremo aggiungere una "pulizia LLM" in 2.6.5e)
  const cleaned = raw
    .replace(/[^\S\r\n]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const chunks = splitToParagraphs(cleaned, 900);
  console.log(`✂️  Suddivisione in blocchi: ${chunks.length} paragrafi`);

  // Upsert in batch
  const points = [];
  let id = Date.now();

  for (const chunk of chunks) {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk
    });
    const vec = emb.data[0].embedding;

    points.push({
      id: id++,
      vector: vec,
      payload: {
        text: chunk,
        source: path.basename(FILEPATH),
        timestamp: new Date().toISOString()
      }
    });

    // invia a blocchi di 64 per sicurezza
    if (points.length >= 64) {
      await qdrant.upsert(COLLECTION, { points });
      console.log(`📌 Upsert: +${points.length} punti`);
      points.length = 0;
    }
  }

  if (points.length) {
    await qdrant.upsert(COLLECTION, { points });
    console.log(`📌 Upsert: +${points.length} punti (finale)`);
  }

  console.log("✅ Ingestione completata. La Biblioteca IRIS è aggiornata.");
}

main().catch(e => {
  console.error("❌ Errore ingestione:", e);
  process.exit(1);
});
