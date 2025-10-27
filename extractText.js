// =======================================================
// extractText.js — Versione compatibile con Node ESM
// Estrae testo dal PDF e crea il file .txt pulito
// =======================================================

import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// ✅ Import corretto di pdf-parse (CommonJS → ESM bridge)
const pdf = require("pdf-parse");

// Percorsi dei file
const INPUT_PDF = "M24 - IL PROGRAMMA KRIST.pdf";
const OUTPUT_TXT = path.join("texts", "M24_IL_PROGRAMMA_KRIST.txt");

async function extractText() {
  try {
    console.log(`📖 Lettura PDF: ${INPUT_PDF}`);

    // 1️⃣ Legge il PDF come buffer
    const dataBuffer = fs.readFileSync(INPUT_PDF);

    // 2️⃣ Estrae il testo
    const data = await pdf(dataBuffer);

    // 3️⃣ Pulizia base del testo
    const cleanText = data.text
      .replace(/\r\n|\r/g, "\n")   // uniforma le righe
      .replace(/[ \t]+/g, " ")     // rimuove tab/spazi multipli
      .replace(/\n{3,}/g, "\n\n")  // limita righe vuote
      .trim();

    // 4️⃣ Crea la cartella texts se non esiste
    const dir = path.dirname(OUTPUT_TXT);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 5️⃣ Scrive il file .txt pulito
    fs.writeFileSync(OUTPUT_TXT, cleanText, "utf8");

    console.log(`✅ Testo estratto e salvato in: ${OUTPUT_TXT}`);
    console.log("👉 Ora il file è pronto per l'import in Qdrant (qdrantInit.js)");
  } catch (err) {
    console.error("❌ Errore durante l'estrazione:", err.message);
  }
}

extractText();
