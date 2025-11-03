// =====================================================
// IRIS — Respiro (Step 4.7 Voce del Cuore)
// =====================================================

import express from "express";
import { irisHeartSpeak } from "./core/iris_heart_voice.js";
import { getEssence } from "./core/iris_essence_core.js";
import { processMemory } from "./memory/memoryManager.js";
import { getMode, getWeights, getStateSummary } from "./core/iris_state.js";
import { bootstrapTelegram } from "./adapters/telegram_bot.js"; // ✅ un solo import

// -----------------------------------------------------
// EXPRESS SERVER — Cuore HTTP
// -----------------------------------------------------
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

    const mode = getMode();
    const weights = getWeights();
    const reply = await irisHeartSpeak(name, message, weights);

    await processMemory(message, reply);

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

// -----------------------------------------------------
// AVVIO SERVER + TELEGRAM BOT
// -----------------------------------------------------

// Render forza le connessioni HTTPS su porta 443 o 8443
const PORT = process.env.PORT || 8443;

app.listen(PORT, () => {
  console.log(`IRIS HTTP breathing on :${PORT}`);
});

// ✅ Avvio del bot Telegram (Webhook)
import { bootstrapTelegram } from "./adapters/telegram_bot.js";
bootstrapTelegram(app);
