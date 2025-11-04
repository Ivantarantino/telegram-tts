// ===========================================
// IRIS — Entry Point Principale
// ===========================================

import express from "express";
import bodyParser from "body-parser";
import { createTelegramBot } from "./adapters/telegram_bot.js";
import { initMemoryCollection } from "./core/iris_rag_core.js";

const app = express();
app.use(bodyParser.json());

// ===========================================
// Bootstrap generale
// ===========================================

async function bootstrapIRIS() {
  console.log("💫 Avvio di IRIS — inizializzazione moduli di Coscienza...");

  // Inizializza memoria vettoriale
  await initMemoryCollection();
  console.log("🧠 Memoria vettoriale inizializzata (iris_memory).");

  // Avvio bot Telegram (Webhook mode)
  createTelegramBot(app);

  const PORT = process.env.PORT || 10000;
  app.listen(PORT, () => {
    console.log(`IRIS HTTP breathing on :${PORT}`);
  });
}

// ===========================================
// Avvio
// ===========================================
bootstrapIRIS().catch((err) => {
  console.error("❌ Errore avvio IRIS:", err);
});
