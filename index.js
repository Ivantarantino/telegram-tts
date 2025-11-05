// ===========================================
// IRIS — Orchestratore del Battito (4.8 — Flusso Webhook)
// Da 4.7: +setWebhook con drop_pending_updates (risolve 409 da Rapporti 1/2)
// Endpoint /bot<token> per Telegram updates
// ===========================================

import express from "express";
import { bootstrapTelegram, setWebhook } from "./adapters/telegram_bot.js";
import { initMemoryCollection } from "./core/iris_rag_core.js";
import { irisHeartSpeak } from "./core/iris_heart_voice.js";
import { processMemory } from "./memory/memoryManager.js";
import { getStateSummary } from "./core/iris_state.js";
import { getEssence } from "./core/iris_essence_core.js";

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

// -------------------- Telegram Webhook Endpoint --------------------
app.post("/bot", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// -------------------- Bootstrap IRIS --------------------
async function bootstrapIRIS() {
  console.log("🚀 Avvio inizializzazione IRIS 3.0G...");
  
  // Init Qdrant
  await initMemoryCollection();
  
  // Bootstrap Telegram (no polling)
  const botInstance = bootstrapTelegram();
  if (botInstance) {
    // Setup webhook: URL su Render (porta 10000, ma Render proxy)
    const webhookUrl = `https://telegram-tts.onrender.com/bot${process.env.TELEGRAM_TOKEN}`;
    await setWebhook(botInstance, webhookUrl);
    console.log("🤖 Telegram attivo (webhook puro).");
  } else {
    console.log("🔹 Telegram disattivato (no token).");
  }
  
  console.log("💠 Tutti i moduli base inizializzati correttamente.");
}

bootstrapIRIS();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Server Express attivo su porta ${PORT}`));
