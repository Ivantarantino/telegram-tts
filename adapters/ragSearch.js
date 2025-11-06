// =====================================================
// adapters/ragSearch.js — IRIS 3.0G Adapter RAG
// =====================================================

import { performRAG, saveRAGMemory } from "../core/iris_rag_core.js";

/**
 * Esegue la ricerca tramite RAG e salva il ricordo risultante.
 * @param {number|string} userId - ID utente Telegram
 * @param {string} prompt - Input testuale dell’utente
 * @returns {Promise<string>} Risposta generata da IRIS
 */
export async function handleRAG(userId, prompt) {
  try {
    // 🔍 Ricerca e generazione risposta
    const answer = await performRAG(prompt);

    // 💾 Salvataggio memoria
    await saveRAGMemory(userId, prompt, answer);

    // ✅ Restituisce la risposta generata
    return answer;
  } catch (error) {
    console.error("❌ Errore in handleRAG:", error.message);
    return "Mi sento un po’ confusa… puoi ripetere con calma?";
  }
}
