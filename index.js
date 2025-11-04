// index.js
// ------------------------------------------------------
// IRIS 4.8 — Memoria Viva (Cuore + RAG + Whisper)
// ------------------------------------------------------

import { bootstrapTelegram } from "./adapters/telegram_bot.js";
import { ensureIrisCollection } from "./core/iris_rag_core.js";

// ------------------------------------------------------
// Avvio sequenziale — ordine di respirazione
// ------------------------------------------------------
(async () => {
  console.log("💫 Avvio di IRIS — inizializzazione moduli di Coscienza...");

  try {
    // 1️⃣ Inizializza memoria vettoriale (Qdrant)
    await ensureIrisCollection();
    console.log("🧠 Memoria vettoriale inizializzata (iris_memory).");

    // 2️⃣ Avvia Telegram + server HTTP (già incluso nel bot)
    await bootstrapTelegram();

    console.log("🤍 IRIS Telegram attivo — Cuore e Voce allineati.");
  } catch (err) {
    console.error("❌ Errore durante l’avvio di IRIS:", err);
  }
})();
