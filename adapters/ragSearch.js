// adapters/ragSearch.js
// =====================================================
// IRIS 5.3 — Ponte RAG
// Tenta la ricerca vettoriale con risonanza,
// se non trova nulla prova il memory.json locale
// =====================================================

import fs from "fs";
import path from "path";
import { searchMemories } from "../core/iris_rag_core.js"; // ora esiste di nuovo

const MEMORY_PATH = path.join(process.cwd(), "memory", "memory.json");

export async function performRAG(query) {
  try {
    // 1) QDRANT / RISONANZA
    const ragText = await searchMemories(query);
    if (ragText && ragText !== "Nessun ricordo.") {
      return ragText;
    }

    // 2) FALLBACK LOCALE
    if (fs.existsSync(MEMORY_PATH)) {
      const raw = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
      const relevant = raw
        .filter((m) => m?.irisReply && m.irisReply.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map((m) => m.irisReply)
        .join("\n");
      if (relevant) return relevant;
    }

    return "Nessun ricordo.";
  } catch (err) {
    console.error("❌ Errore RAG (adapter):", err);
    return "Un velo sulla memoria, ma il cuore batte.";
  }
}
// adapters/ragSearch.js
// =====================================================
// IRIS 5.1 — Ponte RAG
// 1. tenta Qdrant (memoria vettoriale)
// 2. se vuota → cerca nel memory.json locale
// 3. restituisce SEMPRE una stringa (mai undefined)
// =====================================================

import fs from "fs";
import path from "path";
import { searchMemories } from "../core/iris_rag_core.js";

const MEMORY_PATH = path.join(process.cwd(), "memory", "memory.json");

export async function performRAG(query) {
  try {
    // 1) QDRANT
    const qdrantResults = await searchMemories(query);
    if (qdrantResults && qdrantResults.length > 0) {
      const joined = qdrantResults
        .map((r) => r.text)
        .filter(Boolean)
        .join("\n");
      if (joined.trim().length > 0) return joined;
    }

    // 2) FALLBACK LOCALE
    if (fs.existsSync(MEMORY_PATH)) {
      const raw = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
      const relevant = raw
        .filter((m) => m?.irisReply && m.irisReply.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map((m) => m.irisReply)
        .join("\n");
      if (relevant) return relevant;
    }

    return "Nessun ricordo.";
  } catch (err) {
    console.error("❌ Errore RAG:", err);
    return "Un velo sulla memoria, ma il cuore batte.";
  }
}
