// core/dream_rag_context.js – contesto breve RAG per /dream
import { ragSearch } from "./rag_brutale.js";

const DREAM_RAG_MAX_CHUNKS = 3;
const DREAM_RAG_MAX_CHARS = 1600;

export async function getDreamRagContext(testo) {
  if (typeof testo !== "string" || testo.trim().length === 0) {
    return "";
  }

  try {
    console.log("[DREAM_RAG] context start");

    const result = await ragSearch(testo, DREAM_RAG_MAX_CHUNKS);
    const chunks = (result.sources || [])
      .map(source => source.payload?.text)
      .filter(Boolean)
      .map(text => text.trim())
      .filter(Boolean)
      .slice(0, DREAM_RAG_MAX_CHUNKS);

    const context = chunks
      .join("\n\n---\n\n")
      .slice(0, DREAM_RAG_MAX_CHARS);

    console.log("[DREAM_RAG] context done", {
      chunksCount: chunks.length,
      contextLength: context.length
    });

    return context || "";
  } catch (e) {
    console.error("[DREAM_RAG] context error", {
      error: e.message
    });
    return "";
  }
}
