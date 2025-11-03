// =====================================================
// IRIS — Respiro HTTP (Step 4.0 + Telegram bootstrap)
// Mantiene l'app viva su Render e collega Telegram (se BOT_TOKEN presente)
// =====================================================

import express from "express";
import { irisHeartResponse } from "./core/iris_heart_voice.js";
import { getEssence, getWeights } from "./core/iris_essence_core.js";
import { processMemory } from "./memory/memoryManager.js";
import { bootstrapTelegram } from "./adapters/telegram_bot.js";

const app = express();
app.use(express.json());

// Avvia Telegram se BOT_TOKEN esiste
bootstrapTelegram();

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
app.post("/talk", async (req, res) => {
  try {
    const name = (req.body?.name || "Amico").toString().trim();
    const message = (req.body?.message || "").toString();

    const weights = getWeights();
    const reply = irisHeartResponse(name, message, weights);

    await processMemory(message, reply);

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
