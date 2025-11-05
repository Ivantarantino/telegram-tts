// adapters/ragSearch.js
// =====================================================
// IRIS 5.3 — Ponte RAG
// 1. prova la memoria vettoriale (con risonanza dinamica)
// 2. se vuota → fallback su memory/memory.json
// 3. restituisce SEMPRE una stringa
// =====================================================

import { searchMemories } from "../core/iris_rag_core.js";
import fs from "fs";
import path from "path";

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
        .filter(
          (m) =>
            m?.irisReply &&
            m.irisReply.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 3)
        .map((m) => m.irisReply)
        .join("\n");

      if (relevant) return relevant;
    }

    return "Nessun ricordo.";
  } catch (err) {
    console.error("❌ Errore RAG (adapter):", err.message);
    return "Un velo sulla memoria, ma il cuore batte.";
  }
}
