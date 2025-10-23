// === IRIS 3.8 WEBHOOK FIX ===
// La mente calcola, la voce vibra, la Coscienza ricorda.

import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";

// === Configurazione ambiente ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 10000;
const BASE_URL = "https://telegram-tts.onrender.com"; // URL pubblico Render

if (!TELEGRAM_TOKEN || !OPENAI_KEY) {
  console.error("❌ Manca TELEGRAM_TOKEN o OPENAI_API_KEY");
  process.exit(1);
}

// === Inizializzazione bot in modalità webhook ===
const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: true });
const WEBHOOK_PATH = `/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_URL = `${BASE_URL}${WEBHOOK_PATH}`;

// === Express app ===
const app = express();
app.use(express.json());
app.use(bot.webHookCallback(WEBHOOK_PATH));

// === Impostazione webhook Telegram ===
(async () => {
  try {
    await bot.setWebHook(WEBHOOK_URL);
    console.log(`✅ Webhook impostato su Telegram: ${WEBHOOK_URL}`);
  } catch (err) {
    console.error("❌ Errore impostando webhook:", err);
  }
})();

// === Cartella temporanea ===
const TEMP_DIR = path.join(__dirname, "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// === Configurazione IRIS ===
let irisConfig = {
  mode: "HY",
  voice: "alloy",
  lang: "it",
  model: "gpt-4o-mini"
};

// === Avvio server ===
app.get("/", (req, res) => res.send("IRIS 3.8 attiva – Telegram webhook"));
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log("🧭 Modalità: WEBHOOK");
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
  console.log("🔗 Webhook atteso su:", WEBHOOK_PATH);
});
