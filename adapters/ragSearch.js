import fs from "fs";
import { searchMemories } from "../core/iris_rag_core.js";

export async function performRAG(query) {
  try {
    const results = await searchMemories(query);
    if (results.length > 0) {
      return results[0].payload.text;
    }
    const memoryPath = "./memory/memory.json";
    if (fs.existsSync(memoryPath)) {
      const history = JSON.parse(fs.readFileSync(memoryPath, "utf8"));
      return history.length > 0 ? history[history.length - 1].irisReply : "Nessun ricordo.";
    }
    return "Memoria in fioritura...";
  } catch (err) {
    console.error("Errore RAG:", err);
    return "Un velo sulla memoria, ma il cuore batte.";
  }
}
