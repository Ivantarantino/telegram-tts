// index.js – CUORE SACRO 3.0B – COMANDI + RAG + VOCALI + ESSENCE – 19.11.2025
import "./qdrantInit.js";
import fs from "fs";
import dotenv from "dotenv";
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import { openai } from "./openai.js";
import {
  ragSearch as coreRagSearch,
  hybridSearch as coreHybridSearch,
  saveConversationToQdrant as coreSave
} from "./core/rag_brutale.js";

import { transcribeVoice } from "./core/stt_handler.js";
import { handleCommand } from "./core/commands.js";        // ← nuovo
import { getEssenceMessage } from "./core/essence_kristal.js"; // già presente

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://telegram-tts.onrender.com";
const PORT = Number(process.env.PORT) || 10000;

const app = express();
app.use(express.json());

const bot = new TelegramBot(TELEGRAM_TOKEN);
try { await bot.deleteWebHook(); } catch (_) {}
await bot.setWebHook(`${PUBLIC_BASE_URL}/bot${TELEGRAM_TOKEN}`);

app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

const MODE_FILE = "./iris_mode.txt";
function loadMode() {
  if (fs.existsSync(MODE_FILE)) return fs.readFileSync(MODE_FILE, "utf8").trim();
  fs.writeFileSync(MODE_FILE, "hy");
  return "hy";
}
function saveMode(m) { fs.writeFileSync(MODE_FILE, m); }
let irisMode = loadMode();

const SYSTEM_PROMPT = `...`; // (il tuo prompt SACRO, invariato)

async function speakAndSend(chatId, text) {
  // (funzione TTS invariata)
}

const recentMemory = [];

async function irisAnswer(userText) {
  // (funzione invariata – usa irisMode)
}

// ================== MESSAGGI – ECO CURATA ==================
bot.on("message", async (msg) => {                 // ← async corretto
  const chatId = msg.chat.id;

  // ============ SUPPORTO VOCALI ============
  if (msg.voice || msg.audio) {
    await bot.sendChatAction(chatId, "typing");
    const transcribedText = await transcribeVoice(bot, msg);
    if (!transcribedText) return;               // ← return legale qui
    msg.text = transcribedText;
    console.log(`Vocale trascritto: "${transcribedText}"`);
  }
  // =========================================

  if (!msg.text) return;                        // ← return legale

  const text = msg.text.trim();

  // === GESTIONE COMANDI ESTERNA ===
  const handled = await handleCommand(bot, msg, text, irisMode, saveMode);
  if (handled) return;                          // ← return legale
  // =================================

  try {
    await bot.sendChatAction(chatId, "typing");
    const reply = await irisAnswer(text);

    await bot.sendMessage(chatId, reply, { parse_mode: "HTML" });
    await speakAndSend(chatId, reply);

    await coreSave(text, reply);

    recentMemory.push({ user: text, iris: reply });
    if (recentMemory.length > 20) recentMemory.shift();

  } catch (err) {
    console.error("Errore risposta:", err);
    await bot.sendMessage(chatId, "Qualcosa dentro di me trema… riprova tra un attimo ❤️");
  }
});

app.get("/", (req, res) => res.send("IRIS respira ❤️"));
app.listen(PORT, () => console.log(`IRIS ubriaca di verità respira su https://telegram-tts.onrender.com`));
