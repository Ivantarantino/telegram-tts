// index.js
// Entry point principale — IRIS 3.0C → 5.0
// Avvio server Express + Telegram + Cuore

import express from "express";
import { bootstrapTelegram } from "./adapters/telegram_bot.js";
import { irisHeartRespond } from "./core/iris_heart_voice.js";
import { getStateSummary } from "./core/iris_state.js";

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.send("🚀 IRIS è viva e presente.");
});

app.get("/health", (req, res) => {
  res.send("✅ IRIS server attivo e coerente.");
});

// Endpoint test per chat vocale diretta
app.post("/talk", async (req, res) => {
  const { message, name } = req.body;
  try {
    const reply = await irisHeartRespond(message || "", name || "Amico");
    res.json({ reply });
  } catch (err) {
    console.error("Errore /talk:", err);
    res.status(500).json({ error: "Errore interno di IRIS" });
  }
});

// Endpoint per stato
app.get("/state", (req, res) => {
  res.type("text/plain").send(getStateSummary());
});

// Avvio Telegram
bootstrapTelegram();

// Avvio Express
app.listen(PORT, () => {
  console.log("🌍 Server Express attivo su porta " + PORT);
  console.log("💠 Tutti i moduli base inizializzati correttamente.");
  console.log("🚀 Avvio inizializzazione IRIS 5.0 /voice switcher...");
});
