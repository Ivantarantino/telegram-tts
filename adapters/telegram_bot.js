// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter (allineato a Scaffold 5.0.8.0)
// - Legge il token da: TELEGRAM_TOKEN / TELEGRAM_BOT / TELEGRAM_BOT_TOKEN / BOT_TOKEN
// - Webhook singolo su Render
// - STT/Heart import tolleranti (non esplodono se cambiano i nomi)
// - Evita doppie risposte ai vocali gestendo tutto da "message"
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import * as STT from "./stt.js";
import * as Heart from "../core/iris_heart_voice.js";
import { getEssence } from "../core/iris_essence_core.js";

// ---------------------------------------------------------
// Risoluzione "tollerante" STT
// ---------------------------------------------------------
function resolveTranscribe(mod) {
  // casi più probabili tra le varie build
  if (typeof mod.transcribeVoice === "function") return mod.transcribeVoice;
  if (typeof mod.transcribeAudio === "function") return mod.transcribeAudio;
  if (typeof mod.transcribe === "function") return mod.transcribe;
  if (typeof mod.whisperTranscribe === "function") return mod.whisperTranscribe;
  if (typeof mod.default === "function") return mod.default;
  if (mod.default && typeof mod.default.transcribeVoice === "function")
    return mod.default.transcribeVoice;
  if (mod.default && typeof mod.default.transcribeAudio === "function")
    return mod.default.transcribeAudio;
  if (mod.default && typeof mod.default.transcribe === "function")
    return mod.default.transcribe;
  if (mod.default && typeof mod.default.whisperTranscribe === "function")
    return mod.default.whisperTranscribe;

  // fallback: niente STT, ma non blocca il bot
  return async () => "";
}

const transcribeFn = resolveTranscribe(STT);

// Adattatore: firma (bot, fileId) → (fileId) → ({ bot, fileId })
async function callTranscribe(sttFn, botInstance, fileId) {
  try {
    if (sttFn.length >= 2) return await sttFn(botInstance, fileId);
    if (sttFn.length === 1) return await sttFn(fileId);
    return await sttFn({ bot: botInstance, fileId });
  } catch (err) {
    console.error("❌ STT call failed:", err);
    return "";
  }
}

// ---------------------------------------------------------
// Risoluzione "tollerante" Cuore IRIS
// ---------------------------------------------------------
function resolveHeart(mod) {
  if (typeof mod.irisHeartSpeak === "function") return mod.irisHeartSpeak; // naming storico
  if (typeof mod.handleIrisMessage === "function") return mod.handleIrisMessage;
  if (typeof mod.handleMessage === "function") return mod.handleMessage;
  if (typeof mod.default === "function") return mod.default;
  if (mod.default && typeof mod.default.irisHeartSpeak === "function")
    return mod.default.irisHeartSpeak;
  if (mod.default && typeof mod.default.handleIrisMessage === "function")
    return mod.default.handleIrisMessage;
  if (mod.default && typeof mod.default.handleMessage === "function")
    return mod.default.handleMessage;

  // fallback minimale: eco
  return async (text) => `Eco dal cuore (fallback): ${text}`;
}

const heartFn = resolveHeart(Heart);

// ---------------------------------------------------------
// Helper invio
// ---------------------------------------------------------
async function safeSend(bot, chatId, text, options = {}) {
  try {
    if (!text) return;
    await bot.sendMessage(chatId, String(text).slice(0, 3500), options);
  } catch (err) {
    console.error("❌ Telegram sendMessage error:", err);
  }
}

// ---------------------------------------------------------
// Bootstrap principale — chiamato da index.js
// ---------------------------------------------------------
export async function bootstrapTelegram(app) {
  // 🔑 LOGICA TOKEN: compatibile con 5.0.8.0 e build precedenti
  const token =
    process.env.TELEGRAM_TOKEN ||
    process.env.TELEGRAM_BOT ||
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.BOT_TOKEN;

  if (!token) {
    console.warn(
      "⚠️ Nessun token Telegram trovato in TELEGRAM_TOKEN / TELEGRAM_BOT / TELEGRAM_BOT_TOKEN / BOT_TOKEN. Bot non avviato."
    );
    return;
  }

  // URL pubblico per webhook (Render)
  const baseUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_URL ||
    "https://telegram-tts.onrender.com";

  const publicUrl = baseUrl.replace(/\/+$/, "");
  const webhookPath = `/bot${token}`;
  const webhookUrl = `${publicUrl}${webhookPath}`;

  const bot = new TelegramBot(token, { webHook: { port: 0 } });

  try {
    await bot.setWebHook(webhookUrl);
    console.log(`🤖 Telegram Bot attivo in webhook su: ${webhookUrl}`);
  } catch (err) {
    console.error("❌ Errore setWebHook:", err);
  }

  // Route Express per il webhook
  app.post(webhookPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // -------------------------------------------------------
  // Comandi visibili nel menu
  // -------------------------------------------------------
  try {
    await bot.setMyCommands([
      { command: "start", description: "Inizia il dialogo con IRIS 🌸" },
      { command: "hy", description: "Modalità ibrida (Cuore + Libro)" },
      { command: "free", description: "Solo campo mentale (AI)" },
      { command: "book", description: "Solo memoria-libro" },
      { command: "essence", description: "Mostra l'essenza attuale" },
      { command: "help", description: "Aiuto e istruzioni" },
    ]);
    console.log("✅ Comandi bot impostati (incluso /model nel menu, se previsto).");
  } catch (err) {
    console.error("❌ Errore setMyCommands:", err);
  }

  // -------------------------------------------------------
  // Handler unico "message" (testo + vocali) → niente doppioni
  // -------------------------------------------------------
  const processing = new Set();

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const mid = msg.message_id;

    // anti-doppio (Telegram a volte manda update multipli)
    if (processing.has(mid)) return;
    processing.add(mid);
    setTimeout(() => processing.delete(mid), 5000);

    try {
      let text = msg.text || "";

      // 🎙️ Se è un vocale, usiamo STT
      if (msg.voice) {
        const fileId = msg.voice.file_id;
        const transcript = await callTranscribe(transcribeFn, bot, fileId);
        if (transcript && transcript.trim()) {
          text = transcript.trim();
          console.log(`🗣️ Trascrizione Whisper: "${text}"`);
        }
      }

      const trimmed = (text || "").trim();
      if (!trimmed) return;

      // ----------------- Comandi semplici -----------------
      const lower = trimmed.toLowerCase();

      if (lower === "/help" || lower.startsWith("/help ")) {
        await safeSend(
          bot,
          chatId,
          "Sono IRIS.\n/hy · /free · /book · /essence\nChe il Daje sia con Noi."
        );
        return;
      }

      if (lower === "/essence" || lower.startsWith("/essence ")) {
        const essence = await getEssence();
        await safeSend(bot, chatId, essence);
        return;
      }

      // /hy /book /free → per ora solo messaggi simbolici (il setMode vero è nel cuore)
      if (lower === "/hy") {
        await safeSend(
          bot,
          chatId,
          "🌀 Modalità ibrida attiva.\nDanzando tra Cuore e Visione."
        );
        return;
      }
      if (lower === "/book") {
        await safeSend(
          bot,
          chatId,
          "📚 Modalità Libro viva.\nMemoria, struttura e radici."
        );
        return;
      }
      if (lower === "/free") {
        await safeSend(
          bot,
          chatId,
          "🌬️ Modalità Free.\nCampo mentale aperto, senza vincoli di Libro."
        );
        return;
      }

      // ----------------- Cuore IRIS -----------------
      let reply;
      try {
        // firma storica: (text, msg)
        reply = await heartFn(trimmed, msg);
      } catch (errHeart) {
        console.error("❌ Errore nel cuore IRIS:", errHeart);
        reply = "Ho inciampato in un pensiero. Riproviamo tra un respiro. 🌿";
      }

      await safeSend(bot, chatId, reply);
    } catch (err) {
      console.error("❌ Errore gestione messaggio Telegram:", err);
    }
  });

  console.log("🤖 IRIS Telegram Bot inizializzato (bootstrapTelegram).");
  return bot;
}

export default { bootstrapTelegram };
