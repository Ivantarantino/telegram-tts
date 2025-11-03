// =====================================================
// IRIS — Respiro HTTP (Step 4.0 + Step 4.5 Modalità)
// =====================================================
// Mantiene l'app viva su Render e gestisce:
//  - Endpoint di salute (/health)
//  - Endpoint di essenza (/essenza)
//  - Endpoint di dialogo (/talk)
//  - Stato coscienziale e modalità (/hy /book /free future)
// =====================================================

import express from "express";
import { irisHeartSpeak } from "./core/iris_heart_voice.js";
import { getEssence } from "./core/iris_essence_core.js";
import { processMemory } from "./memory/memoryManager.js";
import { getMode, getWeights, getStateSummary } from "./core/iris_state.js";

const app = express();
app.use(express.json());

// -------------------- Health --------------------
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

// -------------------- Essenza --------------------
app.get("/essenza", (req, res) => {
  try {
    const info = getEssence();
    res.status(200).send(info);
  } catch (err) {
    res.status(500).send("Errore nel recupero dell'Essenza.");
  }
});

// -------------------- Stato --------------------
app.get("/state", (req, res) => {
  try {
    const state = getStateSummary();
    res.status(200).send(state);
  } catch (err) {
    res.status(500).send("Errore nel recupero dello stato di IRIS.");
  }
});

// -------------------- Talk --------------------
// Body JSON: { "name": "Ivano", "message": "testo..." }
app.post("/talk", async (req, res) => {
  try {
    const name = (req.body?.name || "Amico").toString().trim();
    const message = (req.body?.message || "").toString();

    // Modalità e pesi attuali
    const mode = getMode();
    const weights = getWeights();

    // Risposta del Cuore
    const reply = await irisHeartSpeak(name, message, weights);

    // Memorizza esperienza e aggiorna Essenza
    await processMemory(message, reply);

    // Ritorna risposta e snapshot dello stato
    const essenceText = getEssence();
    const state = getStateSummary();

    res.status(200).json({
      ok: true,
      mode,
      reply,
      essence: essenceText,
      state
    });
  } catch (err) {
    console.error("Errore /talk:", err);
    res.status(500).json({ ok: false, error: "Errore interno." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IRIS HTTP breathing on :${PORT}`);
  import { bootstrapTelegram } from "./adapters/telegram_bot.js";
bootstrapTelegram();

});
