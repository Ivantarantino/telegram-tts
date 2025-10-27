// =======================================================
// extractText.js — Estrazione PDF → testo (compatibile ESM)
// =======================================================

import fs from "fs";
import path from "path";

// ✅ import dinamico CommonJS per pdf-parse
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

// File di origine e destinazione
const INPUT_PDF = "M24 - IL PROGRAMMA KRIST.pdf";
const OUTPUT_TXT = path.join("texts", "M24_IL_PROGRAMMA_KRIST.txt");

async function extractText() {
  try {
    console.log(`📖 Lettura PDF: ${INPUT_PDF}`);

    const dataBuffer = fs.readFileSync(INPUT_PDF);
    const data = await pdf(dataBuffer);

    const cleanText = data.text
      .replace(/\r\n|\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const dir = path.dirname(OUTPUT_TXT);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(OUTPUT_TXT, cleanText, "utf8");

    console.log(`✅ Testo estratto e salvato in: ${OUTPUT_TXT}`);
    console.log("👉 Ora il file è pronto per l'import in Qdrant (qdrantInit.js)");
  } catch (err) {
    console.error("❌ Errore durante l'estrazione:", err.message);
  }
}

extractText();
