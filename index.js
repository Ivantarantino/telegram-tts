// =====================================================
// IRIS — Respiro HTTP (Ripristino 4.7 Stabile)
// Step 4.7: Base viva con stub per Qdrant/Telegram/STT
// =====================================================

import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { bootstrapTelegram } from "./adapters/telegram_bot.js";
import { initMemoryCollection } from "./core/iris_rag_core.js";
import { irisHeartSpeak } from "./core/iris_heart_voice.js";
import { getEssence } from "./core/iris_essence_core.js";
import { processMemory } from "./memory/memoryManager.js";
import { getStateSummary } from "./core/iris_state.js";

const app = express();
app.use(express.json());

// -------------------- Health --------------------
app.get("/health", (req, res) => res.status(200).send("ok"));

// -------------------- Essenza --------------------
app.get("/essenza", (req, res) => {
  try {
    const info = getEssence();
    res.status(200).send(info);
  } catch {
    res.status(500).send("Errore nel recupero dell'Essenza.");
  }
});

// -------------------- Stato --------------------
app.get("/state", (req, res) => {
  try {
    const state = getStateSummary();
    res.status(200).send(state);
  } catch {
    res.status(500).send("Errore nel recupero dello stato di IRIS.");
  }
});

// -------------------- Talk --------------------
app.post("/talk", async (req, res) => {
  try {
    const name = (req.body?.name || "Amico").toString().trim();
    const message = (req.body?.message || "").toString();

    const reply = await irisHeartSpeak(name, message);

    await processMemory(message, reply);

    const essenceText = getEssence();
    const state = getStateSummary();

    res.status(200).json({
      ok: true,
      reply,
      essence: essenceText,
      state
    });
  } catch (err) {
    console.error("Errore /talk:", err);
    res.status(500).json({ ok: false, error: "Errore interno." });
  }
});

// =====================================================
// Bootstrap IRIS (da Rapporto_2: Momento buono)
// =====================================================
async function bootstrapIRIS() {
  console.log("🚀 Avvio inizializzazione IRIS 4.7...");
  
  try {
    await initMemoryCollection();
    console.log("🧠 Collezione iris_memory trovata.");
  } catch (err) {
    console.error("❌ Errore initMemoryCollection:", err);
  }

  try {
    await bootstrapTelegram();
    console.log("🤖 bootstrapTelegram OK — Telegram inizializzato.");
  } catch (err) {
    console.error("❌ Errore bootstrapTelegram:", err);
  }

  console.log("💠 Tutti i moduli base inizializzati correttamente.");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Server Express attivo su porta ${PORT}`);
  bootstrapIRIS();
});
