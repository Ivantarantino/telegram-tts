// =======================================================
// extractText.js — Estrazione semplice in stile IRIS 2.9
// Converte automaticamente i PDF in testo leggibile
// =======================================================

import fs from "fs";
import pdf from "pdf-parse";
import path from "path";

// File di origine e destinazione
const INPUT_PDF = "M24 - IL PROGRAMMA KRIST.pdf";
const OUTPUT_TXT = path.join("texts", "M24_IL_PROGRAMMA_KRIST.txt");

async function extractText() {
  try {
    console.log(`📖 Lettura PDF: ${INPUT_PDF}`);
    const dataBuffer = fs.readFileSync(INPUT_PDF);
    const data = await pdf(dataBuffer);

    // Pulizia base: togli spazi doppi, righe vuote e interruzioni strane
    const cleanText = data.text
      .replace(/\r\n|\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Scrive il risultato
    fs.writeFileSync(OUTPUT_TXT, cleanText, "utf8");
    console.log(`✅ Testo estratto e salvato in: ${OUTPUT_TXT}`);
  } catch (err) {
    console.error("❌ Errore durante l'estrazione:", err.message);
  }
}

extractText();
