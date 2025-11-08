// core/iris_rag_core.js
// ----------------------------------------------------------
// IRIS · RAG Core 5.1 (preparazione)
// Qui non facciamo ancora la chiamata reale a Qdrant perché
// nel tuo ambiente abbiamo visto permessi/collection non sempre allineati.
// Ma da qui in poi TUTTO il RAG passa da questo file.
// ----------------------------------------------------------

import { computeResonanceScore } from "./iris_rag_resonance.js";

/**
 * Inizializza (o finge di inizializzare) la collection di memoria.
 * Deve esistere perché index.js e gli altri moduli si aspettano questa funzione.
 */
export async function initMemoryCollection() {
  console.log("🧠 [IRIS_RAG_CORE] initMemoryCollection() → stub attivo");
  // qui in futuro: ping a Qdrant, createCollection se non esiste...
  return {
    ok: true,
    collection: "iris_memory",
  };
}

/**
 * Ricerca "intelligente" che usa il coefficiente 𝜑 per decidere quanto scavare.
 * @param {string} query - ciò che ha scritto/parlato l'utente
 * @param {object} options - { mode, limit, context }
 */
export async function searchMemories(query, options = {}) {
  const { mode = "hy", limit = 5, context = {} } = options;

  // 1. calcolo risonanza
  const resonance = computeResonanceScore({ query, mode, context });

  console.log(
    "🔎 [IRIS_RAG_CORE] Risonanza calcolata:",
    JSON.stringify(resonance, null, 2)
  );

  // 2. qui andrebbe la chiamata reale a Qdrant / altro vettoriale
  // per ora restituiamo un payload compatibile
  const fakeResults = [
    {
      id: "stub-1",
      score: resonance.phi,
      text:
        "Questo è un ricordo fittizio di IRIS. Serve solo a mantenere vivo il flusso mentre allineiamo Qdrant.",
      source: "stub/local",
    },
  ];

  return {
    ok: true,
    phi: resonance.phi,
    level: resonance.level,
    suggestedTokens: resonance.suggestedTokens,
    items: fakeResults.slice(0, limit),
  };
}

/**
 * Helper rapido per quando lo user digita /book o una query lunga.
 */
export async function ragAnswerFromQuery(query, options = {}) {
  const res = await searchMemories(query, options);

  // generiamo una bozza di risposta già pronta per il Cuore
  const header =
    res.level === "deep"
      ? "📚 Ho sentito che questa richiesta merita profondità.\n"
      : "📘 Ti porto ciò che ho trovato.\n";

  const body = res.items.map((it) => `• ${it.text}`).join("\n");

  return {
    ...res,
    text: header + body,
  };
}
