// core/iris_rag_core.js
// =====================================================
// IRIS 5.3 — Modulo Centrale RAG con Risonanza Dinamica
// =====================================================

import { searchWithResonance } from "./iris_rag_resonance.js";
import { storeMemory } from "./iris_rag_store.js";

// 🔍 Recupera contesto da memoria vettoriale
export async function performRAG(query) {
  return await searchWithResonance(query);
}

// 💾 Salva nuovi ricordi dopo ogni dialogo
export async function saveRAGMemory(user, input, reply) {
  try {
    await storeMemory(user, input, reply);
  } catch (err) {
    console.error("⚠️ Errore salvataggio memoria:", err.message);
  }
}
