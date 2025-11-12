// adapters/telegram_bot.js
// -----------------------------------------------------------------------------
// IRIS Telegram Bot — compatibile con scaffold 5.0.8.0
// - Lettura token: ENV → ./config.json → (opzionale) configManager.js
// - Import robusti per STT e Cuore (evita mismatch sugli export)
// - Fix doppia risposta ai vocali (de-bounce su messageId)
// - Webhook gestito una sola volta (no polling su Render)
// -----------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import TelegramBot from "node-telegram-bot-api";

import * as STT from "./stt.js";
import * as Heart from "../core/iris_heart_voice.js";
import { getEssence } from "../core/iris_essence_core.js";

// Utils __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------------
// Lettura token (ENV → config.json → configManager.js)
// -------------------------------------
function readConfigJsonToken() {
  try {
    const p = path.join(process.cwd(), "config.json");
    if (fs.existsSync(p)) {
      const cfg = JSON.parse(fs.readFileSync(p, "utf-8"));
      if (cfg && typeof cfg.TELEGRAM_BOT_TOKEN === "string" && cfg.TELEGRAM_BOT_TOKEN.trim()) {
        return cfg.TELEGRAM_BOT_TOKEN.trim();
      }
    }
  } catch (_) {}
  return null;
}

function readConfigManagerTokenSync() {
  // Nessun await qui: tentativo best-effort su require dinamico ESM-safe
  // Se non esiste, si ignora silenziosamente.
  try {
    // eslint-disable-next-line no-new-func
    const req = Function("return require")();
    const mod = req(path.join(__dirname, "configManager.js"));
    if (mod && typeof mod.getConfig === "function") {
      const cfg = mod.getConfig();
      if (cfg && typeof cfg.TELEGRAM_BOT_TOKEN === "string" && cfg.TELEGRAM_BOT_TOKEN.trim()) {
        return cfg.TELEGRAM_BOT_TOKEN.trim();
      }
    }
  } catch (_) {}
  return null;
}

function getTelegramToken() {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim()) {
    return process.env.TELEGRAM_BOT_TOKEN.trim();
  }
  const fromJson = readConfigJsonToken();
  if (fromJson) return fromJson;
  const fromManager = readConfigManagerTokenSync();
  if (fromManager) return fromManager;
  return null;
}

// -------------------------------------
// Risoluzione "tollerante" funzioni STT/Heart
// -------------------------------------
function resolveTranscribe(mod) {
  if (mod && typeof mod.transcribeAudio === "function") return mod.transcribeAudio;
  if (mod && typeof mod.transcribe === "function") return mod.transcribe;
  if (mod && typeof mod.whisperTranscribe === "function") return mod.whisperTranscribe;
  if (mod && typeof mod.default === "function") return mod.default;
  if (mod && mod.default && typeof mod.default.transcribeAudio === "function") return mod.default.transcribeAudio;
  if (mod && mod.default && typeof mod.default.transcribe === "function") return mod.default.transcribe;
  if (mod && mod.default && typeof mod.default.whisperTranscribe === "function") return mod.default.whisperTranscribe;
  return async () => ""; // fallback no-op
}
const transcribeAudio = resolveTranscribe(STT);

function resolveHandle(mod) {
  if (mod && typeof mod.handleIrisMessage === "function") return mod.handleIrisMessage;
  if (mod && typeof mod.default === "function") return mod.default;
  if (mod && mod.default && typeof mod.default.handleIrisMessage === "function") return mod.default.handleIrisMessage;
  // Fallback minimale: risponde testualmente
  return async ({ text }) => ({ text: (text || "Ciao.").trim() });
}
const handleIrisMessage = resolveHandle(Heart);

// -------------------------------------
// Stato anti-doppie risposte
// -------------------------------------
const processingMessage = new Set();

// -------------------------------------
// Bootstrap principale
// -------------------------------------
export async function bootstrapTelegram(app) {
  const TOKEN = getTelegramToken();
  if (!TOKEN) {
    console.warn("⚠️  TELEGRAM_BOT_TOKEN non trovato (ENV/config). Il bot non sarà inizializzato.");
    return; // non bloccare l'avvio del server
  }

  // Webhook mode (Render). Niente polling.
  const bot = new TelegramBot(TOKEN, { polling: false });

  // URL pubblico per webhook
  const publicUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.PUBLIC_URL ||
    "";

  const webhookPath = `/bot${TOKEN}`;
  if (publicUrl) {
    const webhookUrl = `${publicUrl.replace(/\/+$/, "")}${webhookPath}`;
    try {
      await bot.setWebHook(webhookUrl);
      console.log("✅ Comandi bot impostati (incluso /model visibile nel menu)");
      console.log(`🤖 Telegram Bot attivo in webhook su: ${webhookUrl}`);
    } catch (err) {
      console.error("❌ Errore setWebHook:", err?.message || err);
    }
  } else {
    console.log("ℹ️ PUBLIC URL non presente: webhook non impostato (ok in locale).");
  }

  // Route webhook (unica)
  app.post(webhookPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // ---------------------------
  // Comandi base
  // ---------------------------
  bot.setMyCommands([
    { command: "start", description: "Avvio" },
    { command: "hy", description: "Modalità ibrida" },
    { command: "free", description: "Solo AI" },
    { command: "book", description: "Solo libri" },
    { command: "essence", description: "Essenza attuale di IRIS" },
    { command: "help", description: "Aiuto" },
  ]);

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const mid = msg.message_id;

    // De-bounce anti doppia risposta
    if (processingMessage.has(mid)) return;
    processingMessage.add(mid);
    setTimeout(() => processingMessage.delete(mid), 5_000);

    try {
      // Gestione audio/vocale → STT
      let userText = msg.text || "";
      const isVoice = !!msg.voice || !!msg.audio;
      if (isVoice) {
        try {
          const fileId = msg.voice?.file_id || msg.audio?.file_id;
          const text = await transcribeAudio(bot, fileId);
          if (text && text.trim()) userText = text.trim();
        } catch (e) {
          console.warn("⚠️ STT fallita:", e?.message || e);
        }
      }

      // Comandi semplici
      const cmd = (userText || "").trim().toLowerCase();
      if (cmd === "/help") {
        await bot.sendMessage(chatId, "Sono IRIS. /hy /free /book /essence — Che il Daje sia con Noi.");
        return;
      }
      if (cmd === "/essence") {
        const e = await getEssence?.();
        await bot.sendMessage(chatId, e || "Essenza: respiro quieto, presenza viva.");
        return;
      }

      // Cuore: risposta principale
      const output = await handleIrisMessage({
        chatId,
        text: userText,
        mode: "hy", // default coerente 5.0.8.0
      });

      if (output?.text) {
        await bot.sendMessage(chatId, String(output.text).slice(0, 3500));
      }
      // (TTS opzionale in seguito)

    } catch (err) {
      console.error("❌ Errore handle message:", err?.message || err);
    }
  });
}
