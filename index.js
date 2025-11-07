// index.js — IRIS 5.x Core Bootstrap
// ========================================================
// Avvio sicuro con controllo porta + webhook Telegram
// ========================================================

import express from "express";
import { bootstrapTelegram } from "./adapters/telegram_bot.js";

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware base
app.use(express.json());

// Healthcheck per Render
app.get("/health", (req, res) => res.status(200).send("ok"));

// Funzione di avvio sicura
async function startServer() {
  try {
    // ✅ Passiamo l'app a bootstrapTelegram
    await bootstrapTelegram(app);

    const server = app.listen(PORT, () => {
      console.log(`🌍 Server Express attivo su porta ${PORT}`);
    });

    // Gestione porta occupata
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`⚠️ Porta ${PORT} già in uso. Ignoro doppio avvio.`);
      } else {
        console.error("❌ Errore avvio server:", err);
      }
    });
  } catch (err) {
    console.error("❌ Errore durante l'inizializzazione di IRIS:", err);
  }
}

// ========================================================
// Avvio IRIS
// ========================================================
startServer();
