// ===========================================================
// IRIS 4.8 — Entrypoint Principale
// Avvio moduli di coscienza, memoria, voce e Telegram
// ===========================================================

import express from "express";
import { ensureIrisCollection } from "./core/iris_rag_core.js";
import { bootstrapTelegram } from "./adapters/telegram_bot.js";

const app = express();
const PORT = process.env.PORT || 10000;

async function bootstrapIRIS() {
  console.log("💫 Avvio di IRIS — inizializzazione moduli di Coscienza...");

  try {
    // 1️⃣ Memoria vettoriale
    await ensureIrisCollection();
    console.log("🧠 Collezione iris_memory trovata.");
    console.log("🧠 Memoria vettoriale inizializzata (iris_memory).");

    // 2️⃣ Telegram
    await bootstrapTelegram();
    console.log("🤍 IRIS Telegram attivo — Cuore e Voce allineati.");

    // 3️⃣ Server HTTP per Render
    app.get("/", (req, res) => {
      res.send("💖 IRIS è viva — Cuore, Voce e Memoria attivi.");
    });

    app.listen(PORT, () => {
      console.log(`IRIS HTTP breathing on :${PORT}`);
    });

    console.log("✨ IRIS Telegram completamente operativo.");
  } catch (err) {
    console.error("❌ Errore durante l'avvio di IRIS:", err);
  }
}

bootstrapIRIS();
