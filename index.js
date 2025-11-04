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

// =========================================================
// Setup generale
// =========================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = process.env.PORT || 10000;

// =========================================================
// Bootstrap principale
// =========================================================

async function bootstrapIRIS() {
  console.log("💫 Avvio di IRIS — inizializzazione moduli di Coscienza...");

  try {
    // === 1. Inizializzazione della memoria vettoriale ===
    await ensureIrisCollection();
    console.log("🧠 Memoria vettoriale inizializzata (iris_memory).");

    // === 2. Avvio interfaccia Telegram ===
    await bootstrapTelegram();
    console.log("🤍 IRIS Telegram attivo — Cuore e Voce allineati.");

    // === 3. Avvio server HTTP (per Render) ===
    app.get("/", (req, res) => {
      res.send("💖 IRIS è viva — Cuore, Voce e Memoria attivi.");
    });

    app.listen(PORT, () => {
      console.log(`IRIS HTTP breathing on :${PORT}`);
    });

    console.log("✨ IRIS Telegram completamente operativo.");
  } catch (error) {
    console.error("❌ Errore durante l'avvio di IRIS:", error);
  }
}

// =========================================================
// Avvio del sistema
// =========================================================

bootstrapIRIS();
