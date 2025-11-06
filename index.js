// index.js
// =====================================================
// IRIS 5.3.2 — Avvio principale
// =====================================================

import express from "express";
import dotenv from "dotenv";
import { initMemoryCollection } from "./core/iris_rag_core.js";
import "./adapters/telegram_bot.js"; // avvia direttamente il bot

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Avvio
(async () => {
  console.log("🚀 Avvio inizializzazione IRIS 3.0G...");

  try {
    await initMemoryCollection();
  } catch (err) {
    console.log("🧠 Collezione iris_memory già esistente o errore:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`🌍 Server Express attivo su porta ${PORT}`);
    console.log("💠 Tutti i moduli base inizializzati correttamente.");
  });
})();
