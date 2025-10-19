// index.js — IRIS webhook server (Render)
// Modalità: webhook-only, nessun polling. Una sola porta (PORT/10000). Risposta 200 immediata a Telegram.

import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";

// === Env ===
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
const PORT = parseInt(process.env.PORT || "10000", 10);
const BASE_URL =
  process.env.RENDER_EXTERNAL_URL ||
  process.env.PUBLIC_BASE_URL ||
  "https://telegram-tts.onrender.com"; // fallback utile su Render

if (!TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN mancante nelle variabili d'ambiente.");
  process.exit(1);
}

// === Express app ===
const app = express();
app.use(bodyParser.json());

// Healthcheck e root
app.get("/", (_req, res) => {
  res.status(200).send("IRIS – webhook online ✅");
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true, service: "IRIS", mode: "webhook" });
});

// === Telegram bot in modalità webhook ===
const bot = new TelegramBot(TOKEN, { polling: false });

// Imposta/aggiorna il webhook all'avvio
const webhookPath = `/bot${TOKEN}`;
const webhookUrl = `${BASE_URL.replace(/\/$/, "")}${webhookPath}`;

async function ensureWebhook() {
  try {
    const current = await fetch(
      `https://api.telegram.org/bot${TOKEN}/getWebhookInfo`
    ).then((r) => r.json());

    const currentUrl = current?.result?.url || "";
    if (currentUrl !== webhookUrl) {
      console.log("🔗 SetWebhook →", webhookUrl);
      await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      }).then((r) => r.json());
    } else {
      console.log("🔗 Webhook già impostato correttamente.");
    }
  } catch (err) {
    console.error("⚠️ Errore ensureWebhook:", err);
  }
}

// Route del webhook: rispondiamo SUBITO 200, poi processiamo l'update
app.post(webhookPath, (req, res) => {
  try {
    // 1) Risposta immediata a Telegram
    res.sendStatus(200);
    // 2) Processiamo l'update fuori dal ciclo di risposta
    setImmediate(() => {
      try {
        const msg = req.body?.message;
        const from =
          msg?.from?.first_name ||
          msg?.from?.username ||
          msg?.from?.id ||
          "utente";
        const text = msg?.text || "(non-text)";
        console.log(`📩 Messaggio da ${from}: ${text}`);
        bot.processUpdate(req.body);
      } catch (innerErr) {
        console.error("Errore nel processamento update:", innerErr);
      }
    });
  } catch (err) {
    console.error("Errore nel webhook:", err);
    // (abbiamo già mandato 200; eventuali errori sono solo loggati)
  }
});

// === HANDLERS DI BASE ===
// Nota: in questo STEP non tocchiamo RAG/TTS. Solo ricezione stabile e log chiari.
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text || "";
    // Log essenziale
    console.log(`🧭 on.message → chat:${chatId} text:"${text}"`);

    // Risposta minima per confermare la catena completa webhook→bot
    // (Nel prossimo step reinseriremo RAG/TTS/comandi)
    await bot.sendMessage(
      chatId,
      "👍 Ricevuto dal webhook. (Step 1: stabilizzazione canale)."
    );
  } catch (err) {
    console.error("Errore handler on.message:", err);
  }
});

// === Avvio server ===
app.listen(PORT, async () => {
  console.log(`☁️ Ambiente Render attivo su porta ${PORT}`);
  console.log(`🤖 Webhook previsto su: ${webhookUrl}`);
  console.log("🧭 Modalità iniziale: WEBHOOK-ONLY");
  await ensureWebhook();
});
