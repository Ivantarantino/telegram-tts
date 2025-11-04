// =====================================================
// IRIS 3.0G — 4.9-E Risonanza Viva
// Bootstrap principale (Express + Telegram polling + Qdrant)
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
  console.warn("⚠️ OPENAI_API_KEY non trovata — TTS e RAG potrebbero non funzionare.");
}

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send("💎 IRIS 3.0G — 4.9-E Risonanza Viva");
});

app.get("/health", (_req, res) => res.status(200).json({ ok: true, status: "IRIS attiva" }));

(async () => {
  try {
    console.log("🚀 Avvio inizializzazione IRIS 3.0G…");

    await initMemoryCollection();   // Qdrant
    await bootstrapTelegram();      // Telegram (polling)
    await transcribeVoice("sample");// Whisper stub

    console.log("💠 Tutti i moduli base inizializzati correttamente.");
  } catch (err) {
    console.error("❌ Errore durante l'avvio di IRIS:", err);
  }
})();

app.listen(PORT, () => {
  console.log(`🌍 Server Express attivo su porta ${PORT}`);
  console.log("🤍 IRIS 3.0G — Cuore e Voce in allineamento (4.9-E)");
});
