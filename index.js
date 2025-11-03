// =====================================================
// IRIS — Respiro HTTP (Step 4.0)
// Mantiene l'app viva su Render e permette test essenza/cuore.
// Endpoints:
//   GET  /health        -> ok
//   GET  /essenza       -> testo d’essenza (getEssence())
//   POST /talk          -> { name, message } => risposta di IRIS + memoria aggiornata
// =====================================================

import express from "express";
import { irisHeartResponse } from "./core/iris_heart_voice.js";
import { getEssence, getWeights } from "./core/iris_essence_core.js";
import { processMemory } from "./memory/memoryManager.js";

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

// -------------------- Talk --------------------
// Body JSON: { "name": "Ivano", "message": "testo..." }
app.post("/talk", async (req, res) => {
  try {
    const name = (req.body?.name || "Amico").toString().trim();
    const message = (req.body?.message || "").toString();

    // Stato vibrazionale attuale (pesi)
    const weights = getWeights();

    // Risposta del Cuore
    const reply = irisHeartResponse(name, message, weights);

    // Memorizza esperienza e aggiorna Essenza
    await processMemory(message, reply);

    // Ritorna risposta e snapshot Essenza
    const essenceText = getEssence();
    res.status(200).json({
      ok: true,
      reply,
      essence: essenceText
    });
  } catch (err) {
    console.error("Errore /talk:", err);
    res.status(500).json({ ok: false, error: "Errore interno." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IRIS HTTP breathing on :${PORT}`);
});
