// adapters/ragSearch.js
// -------------------------------------------------------------
// Adapter unico per usare il RAG di IRIS da Telegram o da HTTP
// -------------------------------------------------------------

import { searchMemories } from "../core/iris_rag_core.js";

export async function ragSearch(query = "", mode = "hy") {
  // se la query è vuota non ha senso andare al RAG
  if (!query || !query.trim()) {
    return {
      resonance: { phi: 0.3, tokens: 200, mode },
      results: [],
      message: "⚠️ Nessuna query fornita al RAG.",
      source: "empty"
    };
  }

  const data = await searchMemories(query, mode);

  // standardizziamo la risposta
  return {
    resonance: data.resonance,
    results: data.results,
    source: data.source,
    message:
      data.results && data.results.length
        ? "📚 Documenti trovati e pronti per essere fusi nel Cuore."
        : "📚 Nessun documento trovato, uso solo Cuore e Memoria.",
  };
}
