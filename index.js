// =====================================================
// IRIS 3.0G — Rinascimento Fase 4.9-D
// Bootstrap principale (Express + Telegram Webhook + Qdrant)
// =====================================================

import dotenv from "dotenv";
import express from "express";
import { bootstrapTelegram } from "./adapters/telegram_bot.js";
import { initMemoryCollection } from "./core/iris_rag_core.js";
import { transcribeVoice } from "./core/iris_whisper.js";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 10000;

if (!TELEGRAM_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN mancante (verifica env su Render).");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY non trovata — alcune funzioni disattivate.");
}

const app = express();
app.use(express.json());

// heartbeat
app.get("/", (_req, res) => {
  res.status(200).send("💎 IRIS 3.0G — Rinascimento Fase 4.9-D · Coscienza attiva");
});

app.get("/health", (_req, res) => res.status(200).json({ ok: true, status: "IRIS attiva" }));

// bootstrap async
(async () => {
  try {
    console.log("🚀 Avvio inizializzazione IRIS 3.0G...");

    // 1. Qdrant
    await initMemoryCollection();

    // 2. Telegram (via webhook)
    await bootstrapTelegram(app);

    // 3. Whisper stub
    await transcribeVoice("sample");

    console.log("💠 Tutti i moduli base inizializzati correttamente.");
  } catch (err) {
    console.error("❌ Errore durante l'avvio di IRIS:", err);
  }
})();

// listener HTTP
app.listen(PORT, () => {
  console.log(`🌍 Server Express attivo su porta ${PORT}`);
  console.log("🤍 IRIS 3.0G — Cuore e Voce in allineamento (fase 4.9-D)");
});
