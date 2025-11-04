// =====================================================
// IRIS 3.0G — Ristoro 4.7 (base stabile)
// -----------------------------------------------------
// Avvia Express, inizializza Qdrant, avvia Telegram in polling,
// attiva lo stub di Whisper.
// =====================================================

import dotenv from "dotenv";
import express from "express";
import { initMemoryCollection } from "./core/iris_rag_core.js";
import { bootstrapTelegram } from "./adapters/telegram_bot.js";
import { transcribeVoice } from "./core/iris_whisper.js";

dotenv.config();

const PORT = process.env.PORT || 10000;

const app = express();
app.use(express.json());

// endpoint di servizio
app.get("/", (_req, res) => {
  res.status(200).send("💎 IRIS 3.0G — Base stabile 4.7");
});

(async () => {
  try {
    console.log("🚀 Avvio inizializzazione IRIS 3.0G...");
    // 1) memoria vettoriale (qdrant)
    await initMemoryCollection();
    // 2) telegram reale (polling)
    await bootstrapTelegram();
    // 3) whisper stub
    await transcribeVoice("sample");

    console.log("💠 Tutti i moduli base inizializzati correttamente.");
  } catch (err) {
    console.error("❌ Errore in fase di bootstrap IRIS:", err);
  }
})();

app.listen(PORT, () => {
  console.log(`🌍 Server Express attivo su porta ${PORT}`);
  console.log("🤍 IRIS 3.0G — Cuore saldo (4.7 restore)");
});
