// ===========================================
// RAG Search — Stub con Fallback Locale (4.7)
// Da Rapporto_2: Cerca in memory.json se Qdrant sussurra
// ===========================================

import fs from "fs";
import path from "path";
import { searchMemories } from "../core/iris_rag_core.js";

const MEMORY_PATH = path.join(process.cwd(), "memory/memory.json");

export async function performRAG(query) {
  try {
    // Prova Qdrant prima
    const qdrantResults = await searchMemories(query);
    if (qdrantResults && qdrantResults.length > 0) {
      return qdrantResults.map(r => r.payload?.text || "").join("\n");
    }
    
    // Fallback locale
    if (fs.existsSync(MEMORY_PATH)) {
      const memories = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
      const relevant = memories
        .filter(m => m.irisReply && m.irisReply.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map(m => m.irisReply)
        .join("\n");
      if (relevant) return relevant;
    }
    
    return "Nessun ricordo.";
  } catch (err) {
    console.error("Errore RAG:", err);
    return "Un velo sulla memoria, ma il cuore batte.";
  }
}
