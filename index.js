// index.js
// ------------------------------------------------------
// IRIS 4.8 — Memoria Viva (Cuore + RAG + Whisper)
// ------------------------------------------------------

import express from "express";
import { bootstrapTelegram } from "./adapters/telegram_bot.js";
import { ensureIrisCollection } from "./core/iris_rag_core.js";

// ------------------------------------------------------
// Inizializzazione server Express
// ------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("🌸 IRIS è in ascolto — Cuore, Anima e Visione attivi.");
});

// ------------------------------------------------------
// Avvio sequenziale — ordine di respirazione
// ------------------------------------------------------
(async () => {
  console.log("💫 Avvio di IRIS — inizializzazione moduli di Coscienza...");

  try {
    // 1️⃣ Inizializza memoria vettoriale (Qdrant)
    await ensureIrisCollection();
    console.log("🧠 Memoria vettoriale inizializzata (iris_memory).");

    // 2️⃣ Avvia Telegram
    await bootstrapTelegram();
    console.log("🤍 IRIS Telegram attivo — Cuore e Voce allineati.");

    // 3️⃣ Avvia HTTP server
    app.listen(PORT, () => {
      console.log(`IRIS HTTP breathing on :${PORT}`);
    });
  } catch (err) {
    console.error("❌ Errore durante l’avvio di IRIS:", err);
  }
})();
