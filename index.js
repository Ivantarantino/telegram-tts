// index.js
// Entry point IRIS 5.x — Express + Telegram webhook

import express from "express";
import { bootstrapTelegram } from "./adapters/telegram_bot.js";
import { irisHeartRespond } from "./core/iris_heart_voice.js";
import { getStateSummary } from "./core/iris_state.js";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// health
app.get("/", (req, res) => {
  res.send("🚀 IRIS è viva e presente.");
});

app.get("/state", (req, res) => {
  res.type("text/plain").send(getStateSummary());
});

// avvio telegram in modalità webhook agganciandolo a express
await bootstrapTelegram(app);

app.listen(PORT, () => {
  console.log("🌍 Server Express attivo su porta " + PORT);
  console.log("💠 Tutti i moduli base inizializzati correttamente.");
  console.log("🚀 Avvio inizializzazione IRIS 5.x /webhook...");
});
