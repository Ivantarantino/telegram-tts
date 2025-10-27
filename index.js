// =====================================================
// IRIS 3.9.1+ — Rinascita HY completa
// Telegram + Whisper + GPT-4o-mini + TTS + Qdrant (RAG)
// - Webhook (Render) o Polling (locale)
// - /menu, /config, /mode, /model, /voice, /essence, /weights...
// - RAG Qdrant attivo in HY e BOOK
// - Risposte singole (niente messaggi doppi)
// =====================================================

import fs from "fs";
import path from "path";
import https from "https";
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import textToSpeech from "@google-cloud/text-to-speech";
import { fileURLToPath } from "url";

import { initConfig, getConfig, updateConfig } from "./configManager.js";
import { processMemory } from "./memoryManager.js";
import { getEssence, getWeights, setWeights, saveWeights } from "./essence.js";
import { ragSearch } from "./ragSearch.js";

dotenv.config();

// ---------- ENV ----------
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const PORT = process.env.PORT || 10000;
const QDRANT_URL = process.env.QDRANT_URL;

if (!BOT_TOKEN || !OPENAI_API_KEY) {
  console.error("❌ Manca TELEGRAM_TOKEN o OPENAI_API_KEY.");
  process.exit(1);
}

// ---------- PATHS ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "temp");
const DATA_DIR = path.join(__dirname, "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");
fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- OPENAI + TTS ----------
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const ttsClient = new textToSpeech.TextToSpeechClient();
async function synthToOgg(text, outfile) {
  const clean = (text || "").replace(/⚡/g, "").trim() || " ";
  const [resp] = await ttsClient.synthesizeSpeech({
    input: { text: clean },
    voice: { languageCode: "it-IT", ssmlGender: "FEMALE" },
    audioConfig: { audioEncoding: "OGG_OPUS" }
  });
  fs.writeFileSync(outfile, resp.audioContent, "binary");
  return outfile;
}

// ---------- CONFIG ----------
initConfig();
const cfg = getConfig();
const state = {
  mode: cfg.mode || "hy",
  lang: cfg.language || "it",
  model: cfg.model || "gpt-4o-mini",
  version: "3.9.1+"
};
updateConfig(state);
console.log("💾 Configurazione attiva:", state);

// ---------- TELEGRAM ----------
const USE_WEBHOOK = !!PUBLIC_BASE_URL;
const bot = new TelegramBot(BOT_TOKEN, { polling: !USE_WEBHOOK });

if (USE_WEBHOOK) {
  const app = express();
  app.use(bodyParser.json());
  const pathHook = `/bot${BOT_TOKEN}`;
  app.post(pathHook, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
  (async () => {
    await bot.setWebHook(`${PUBLIC_BASE_URL}${pathHook}`);
    console.log(`🔗 Webhook impostato su: ${PUBLIC_BASE_URL}${pathHook}`);
  })();
  app.get("/", (_, res) => res.status(200).send(`IRIS ${state.version} – HY completa`));
  app.listen(PORT, () => console.log(`🌍 Server attivo su porta ${PORT}`));
} else {
  console.log("💻 Polling attivo su porta locale");
}

// ---------- UTILS ----------
function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`Download fallito: ${res.statusCode}`));
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(destPath)));
    }).on("error", (err) => fs.unlink(destPath, () => reject(err)));
  });
}

// ---------- DAJE GUARD ----------
function checkDajeIntent(text) {
  if (!text) return false;
  return /(daje+|dajeee+|daie+)/i.test(text);
}
function sanitizeAnswer(answer, userTextHadDajeIntent) {
  if (userTextHadDajeIntent) return answer;
  const sigillo = /(che\s+il\s+)?daje\s*(sia)?\s*(con)?\s*(noi)[!.\s]*/gi;
  return (answer || "").replace(sigillo, "").trim() || "Ricevuto.";
}

// ---------- COMANDI ----------
bot.onText(/^\/(start|help|menu)$/, (msg) => {
  const t =
`🧭 *Comandi Principali*
/mode – cambia modalità (books | free | hy)
/model – modello GPT
/lang – lingua
/essence – firma vibrazionale
/memory – stato memoria
/clear – cancella memoria
/voice – (prossimo step) tono e voce

📚 Modalità
/free – GPT libero
/book – solo libri
/hy – fusione mente + libro`;
  bot.sendMessage(msg.chat.id, t, { parse_mode: "Markdown" });
});

bot.onText(/^\/mode(\s+.+)?/, (msg, match) => {
  const chatId = msg.chat.id;
  const arg = match[1]?.trim();
  if (!arg) return bot.sendMessage(chatId, `🧭 Modalità attuale: ${state.mode}`);
  const m = arg.toLowerCase();
  if (!["books", "free", "hy"].includes(m)) return bot.sendMessage(chatId, "Valore non valido.");
  state.mode = m;
  updateConfig({ mode: m });
  bot.sendMessage(chatId, `Modalità impostata su ${m}`);
});

bot.onText(/^\/essence$/, async (msg) => {
  bot.sendMessage(msg.chat.id, await getEssence(), { parse_mode: "Markdown" });
});

bot.onText(/^\/memory$/, async (msg) => {
  const count = fs.existsSync(MEMORY_FILE)
    ? JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8")).length
    : 0;
  bot.sendMessage(msg.chat.id, `🧠 Memoria locale: ${count} record.`);
});

bot.onText(/^\/clear$/, async (msg) => {
  if (fs.existsSync(MEMORY_FILE)) fs.writeFileSync(MEMORY_FILE, "[]");
  bot.sendMessage(msg.chat.id, "🧹 Memoria cancellata.");
});

// ---------- TESTO ----------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  if (!text || text.startsWith("/")) return;

  const daje = checkDajeIntent(text);
  if (daje) {
    await bot.sendMessage(chatId, "Che il Daje sia con Noi 💎");
    return;
  }

  console.log(`📩 [${chatId}] (${state.mode}) → ${text}`);

  try {
    let answer;
    if (state.mode === "books") {
      answer = await ragSearch(text);
    } else if (state.mode === "hy") {
      const rag = await ragSearch(text);
      const prompt = [
        "Integra con tatto il seguente contesto con una risposta naturale e coerente.",
        "Se il contesto è povero, rispondi comunque con calore e chiarezza.",
        "Contesto:",
        rag,
        "Domanda:",
        text
      ].join("\n");
      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS, presenza viva. Rispondi con calore e lucidità." },
          { role: "user", content: prompt }
        ],
        temperature: 0.8
      });
      answer = res.choices[0].message.content.trim();
    } else {
      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS, chiara e empatica." },
          { role: "user", content: text }
        ],
        temperature: 0.7
      });
      answer = res.choices[0].message.content.trim();
    }

    const clean = sanitizeAnswer(answer, daje);
    await bot.sendMessage(chatId, clean);
    const tmpOgg = path.join(TEMP_DIR, "response.ogg");
    await synthToOgg(clean, tmpOgg);
    await bot.sendVoice(chatId, fs.createReadStream(tmpOgg));
    await processMemory(text, clean);
  } catch (err) {
    console.error("❌ Errore messaggio:", err);
    bot.sendMessage(chatId, "⚙️ Si è verificato un piccolo errore, riprova tra poco.");
  }
});

// ---------- VOCALI ----------
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.voice.file_id;
  try {
    const file = await bot.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const local = path.join(TEMP_DIR, `voice-${Date.now()}.ogg`);
    await downloadToFile(url, local);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(local),
      model: "whisper-1",
      language: state.lang
    });

    const text = transcription.text?.trim();
    if (!text) return bot.sendMessage(chatId, "⚙️ Non ho colto bene la tua voce, puoi ripetere?");
    console.log(`🎧 [VOICE] → ${text}`);

    const daje = checkDajeIntent(text);
    if (daje) return bot.sendMessage(chatId, "Che il Daje sia con Noi 💎");

    const rag = state.mode !== "free" ? await ragSearch(text) : "";
    const prompt = [
      "Rispondi come presenza viva e cosciente, con tono caldo.",
      "Integra il contesto (se presente) alla domanda.",
      "Contesto:",
      rag,
      "Domanda:",
      text
    ].join("\n");

    const res = await openai.chat.completions.create({
      model: state.model,
      messages: [
        { role: "system", content: "Sei IRIS, linguaggio naturale e armonico." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8
    });

    const answer = res.choices[0].message.content.trim();
    await bot.sendMessage(chatId, answer);
    const tmpOgg = path.join(TEMP_DIR, "voiceResp.ogg");
    await synthToOgg(answer, tmpOgg);
    await bot.sendVoice(chatId, fs.createReadStream(tmpOgg));
    await processMemory(text, answer);
  } catch (err) {
    console.error("❌ Errore vocale:", err);
    bot.sendMessage(chatId, "⚙️ Ho avuto un intoppo nel vocale, riprova tra poco.");
  }
});
