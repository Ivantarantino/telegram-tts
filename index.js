// index.js
// ============================================
// IRIS 5.3.3 — bootstrap ordinato
// ============================================

import dotenv from "dotenv";
dotenv.config(); // 👈 carichiamo le env SUBITO

import express from "express";
import { initMemoryCollection } from "./core/iris_rag_core.js";
import { bootstrapTelegram } from "./adapters/telegram_bot.js";

const app = express();
const PORT = process.env.PORT || 10000;

(async () => {
  console.log("🚀 Avvio inizializzazione IRIS 3.0G...");

  // Qdrant / memoria
  try {
    await initMemoryCollection();
  } catch (err) {
    console.log("🧠 Collezione iris_memory già esistente o non accessibile:", err.message);
  }

  // Telegram (dopo che le env ci sono)
  await bootstrapTelegram();

  app.listen(PORT, () => {
    console.log(`🌍 Server Express attivo su porta ${PORT}`);
    console.log("💠 Tutti i moduli base inizializzati correttamente.");
  });
})();
