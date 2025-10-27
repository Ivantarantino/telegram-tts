// =======================================================
// extractText.js — Estrazione semplice in stile IRIS 2.9
// Converte automaticamente i PDF in testo leggibile (.txt)
// =======================================================

import fs from "fs";
import path from "path";
import pkg from "pdf-parse";
const pdf = pkg; // compatibilità CommonJS con import ESM

// File di origine e destinazione
const INPUT_PDF = "M24 - IL PROGRAMMA KRIST.pdf";
const OUTPUT_TXT = path.join("texts", "M24_IL_PROGRAMMA_KRIST.txt");

async function extractText() {
  try {
    console.log(`📖 Lettura PDF: ${INPUT_PDF}`);

    // Legge il PDF
    const dataBuffer = fs.readFileSync(INPUT_PDF);
    const data = await pdf(dataBuffer);

    // Pulizia base: rimuove ritorni di riga, spazi eccessivi, righe vuote
    const cleanText = data.text
      .replace(/\r\n|\r/g, "\n")      // uniforma le righe
      .replace(/[ \t]+/g, " ")        // rimuove tab/spazi doppi
      .replace(/\n{3,}/g, "\n\n")     // limita righe vuote
      .trim();

    // Crea la cartella se non esiste
    const dir = path.dirname(OUTPUT_TXT);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Scrive il file di output
    fs.writeFileSync(OUTPUT_TXT, cleanText, "utf8");

    console.log(`✅ Testo estratto e salvato in: ${OUTPUT_TXT}`);
    console.log("👉 Ora il file è pronto per l'import in Qdrant (qdrantInit.js)");
  } catch (err) {
    console.error("❌ Errore durante l'estrazione:", err.message);
  }
}

extractText();
