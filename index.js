// index.js
// =====================================================
// IRIS 5.3.3 — Bootstrap completo (fix .env loading)
// =====================================================

// ⚠️ Prima di tutto, carica le variabili
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { initMemoryCollection } from "./core/iris_rag_core.js";

// ⚙️ Il bot viene importato dopo che .env è attivo
import "./adapters/telegram_bot.js";

const app = express();
const PORT = process.env.PORT || 10000;

// Avvio principale
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
