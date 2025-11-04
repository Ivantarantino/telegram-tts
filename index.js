// ===========================================
// IRIS — Core Index (Main Entrypoint)
// Gestisce l'inizializzazione completa del sistema
// ===========================================

import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

import { ensureIrisCollection } from "./core/iris_rag_core.js";
import { bootstrapTelegram } from "./adapters/telegram_bot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = process.env.PORT || 10000;

// =========================================================
// Avvio principale di IRIS
// =========================================================

async function bootstrapIRIS() {
  console.log("💫 Avvio di IRIS — inizializzazione moduli di Coscienza...");

  try {
    // 1️⃣ Inizializza la memoria vettoriale
    await ensureIrisCollection();
    console.log("🧠 Memoria vettoriale inizializzata (iris_memory).");

    // 2️⃣ Avvia il bot Telegram
    await bootstrapTelegram();
    console.log("🤍 IRIS Telegram attivo — Cuore e Voce allineati.");

    // 3️⃣ Avvia Express SOLO se non già attivo
    startExpressServer();

    console.log("✨ IRIS Telegram completamente operativo.");
  } catch (error) {
    console.error("❌ Errore durante l'avvio di IRIS:", error);
  }
}

// =========================================================
// Server HTTP con controllo sulla porta
// =========================================================

function startExpressServer() {
  const server = app.listen(PORT, () => {
    console.log(`IRIS HTTP breathing on :${PORT}`);
  });

  // Gestisce l'errore EADDRINUSE senza crash
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️  Porta ${PORT} già in uso, Express non verrà riavviato.`);
    } else {
      console.error("Errore server HTTP:", err);
    }
  });

  app.get("/", (req, res) => {
    res.send("💖 IRIS è viva — Cuore, Voce e Memoria attivi.");
  });
}

// =========================================================
// Esegui il bootstrap
// =========================================================

bootstrapIRIS();
