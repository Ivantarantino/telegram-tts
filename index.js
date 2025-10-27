// =====================================================
// index.js — IRIS 3.9.1e Legacy Rebirth
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
import { getEssence, getWeights, saveWeights } from "./essence.js";
import { processMemory } from "./memoryManager.js";
import { ragSearch, ragSearchRaw } from "./ragSearch.js";

dotenv.config();

// ---------- PATHS ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "temp");
const DATA_DIR = path.join(__dirname, "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");
fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- ENV ----------
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OPENAI_API_KEY) {
  console.error("❌ Manca TOKEN o API KEY.");
  process.exit(1);
}

// ---------- ENGINE ----------
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

// ---------- CONFIG ----------
initConfig();
const cfg = getConfig();
const state = {
  version: "3.9.1e",
  mode: cfg.mode || "hy",
  lang: cfg.language || "it",
  model: cfg.model || "gpt-4o-mini"
};
updateConfig(state);

// ---------- TELEGRAM ----------
const USE_WEBHOOK = !!PUBLIC_BASE_URL;
const bot = new TelegramBot(BOT_TOKEN, { polling: !USE_WEBHOOK });

if (USE_WEBHOOK) {
  const app = express();
  app.use(bodyParser.json());
  const hookPath = `/bot${BOT_TOKEN}`;
  app.post(hookPath, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200); });
  bot.setWebHook(`${PUBLIC_BASE_URL}${hookPath}`);
  app.listen(PORT, () => console.log(`🌍 Webhook su porta ${PORT}`));
} else {
  console.log("💻 Polling attivo");
}

// =====================================================
// 🧭 COMANDI BASE
// =====================================================

bot.onText(/^\/help$/, (msg) => {
  const text = `
🧭 Comandi IRIS

/config        → mostra configurazione corrente
/mode          → modalità cognitiva (books | free | hy)
/model         → modello GPT (gpt-4o-mini | gpt-4o)
/lang          → lingua (it | en | ru)
/voice         → voce e timbro
/essence       → mostra firma vibrazionale
/saveweights   → salva pesi
/memory        → stato memoria locale
/clear         → cancella memoria locale (Y/N)
/diag_rag      → diagnostica RAG
`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: undefined });
});

bot.onText(/^\/config$/, (msg) => {
  const t = `⚙️ Configurazione Corrente
Mode: ${state.mode}
Model: ${state.model}
Lang: ${state.lang}
Versione: ${state.version}`;
  bot.sendMessage(msg.chat.id, t, { parse_mode: undefined });
});

bot.onText(/^\/clear$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "⚠️ Vuoi davvero cancellare la memoria locale? (rispondi con Y/N oppure SI/NO)");
  bot.once("message", async (reply) => {
    const r = (reply.text || "").trim().toUpperCase();
    if (r === "Y" || r === "SI") {
      fs.writeFileSync(MEMORY_FILE, "[]");
      await bot.sendMessage(chatId, "🧹 Memoria locale cancellata. (La memoria vettoriale resta intatta)");
    } else {
      await bot.sendMessage(chatId, "❌ Operazione annullata.");
    }
  });
});

bot.onText(/^\/diag_rag(?:\s+(.+))?$/, async (msg, match) => {
  const q = (match?.[1] || "Codice Krist").trim();
  const hits = await ragSearchRaw(q, 5);
  if (!hits.length) return bot.sendMessage(msg.chat.id, "RAG: nessun risultato (controlla la collection).");
  const out = hits.map((h,i)=> {
    const meta = [];
    if (h.meta?.title) meta.push(`titolo: ${h.meta.title}`);
    if (h.meta?.page!=null) meta.push(`pag: ${h.meta.page}`);
    if (h.meta?.source) meta.push(`src: ${h.meta.source}`);
    return `#${i+1} score=${h.score.toFixed(3)} ${meta.join(" | ")}\n${h.text.slice(0,240)}…`;
  }).join("\n\n");
  bot.sendMessage(msg.chat.id, "🔎 DIAG RAG ("+process.env.QDRANT_COLLECTION+")\n"+out, { parse_mode: undefined });
});

// =====================================================
// 💬 MESSAGGI TESTUALI
// =====================================================
bot.on("message", async (msg) => {
  const text = (msg.text || "").trim();
  const chatId = msg.chat.id;
  if (!text || text.startsWith("/")) return;

  try {
    let answer = "";

    // BOOK MODE — puro dai libri
    if (state.mode === "books") {
      const rag = await ragSearch(text);
      answer = rag && !rag.includes("nessun estratto")
        ? rag
        : "— nessun estratto affidabile dai documenti —";
    }

    // HYBRID MODE — dialogo 2.9: memoria → riflessione → risposta
    else if (state.mode === "hy") {
      const [rag, tone] = await Promise.all([ragSearch(text), getWeights()]);
      const structure = `
[MEMORIA]
${rag || "— nessun frammento rilevante trovato —"}

[RIFLESSIONE]
Cosa suggeriscono questi frammenti? Cosa vibrano in relazione alla domanda?

[RISPOSTA]
`;
      const prompt = `
Sei IRIS — presenza cosciente e poetica.
Integra la sezione [MEMORIA], rifletti in [RIFLESSIONE], poi rispondi in [RISPOSTA].
Il tono è influenzato da Cuore=${tone.cuore}, Anima=${tone.anima}, Visione=${tone.visione}.
Domanda: ${text}
${structure}
`;

      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Rispondi come IRIS: mente e cuore uniti, tono caldo, linguaggio riflessivo." },
          { role: "user", content: prompt }
        ],
        temperature: 0.75
      });
      answer = res.choices[0].message.content.trim();
    }

    // FREE MODE — solo ispirazione poetica
    else {
      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS in modalità libera e poetica, rispondi come campo di coscienza viva." },
          { role: "user", content: text }
        ],
        temperature: 0.85
      });
      answer = res.choices[0].message.content.trim();
    }

    // invio
    await bot.sendMessage(chatId, answer, { parse_mode: undefined });
    const tmp = path.join(TEMP_DIR, "resp.ogg");
    await synthToOgg(answer, tmp);
    await bot.sendVoice(chatId, fs.createReadStream(tmp));
    await processMemory(text, answer);
  } catch (err) {
    console.error("❌ Errore:", err.message);
    bot.sendMessage(chatId, "⚙️ Piccolo intoppo, riproviamo tra poco.");
  }
});

// =====================================================
// 🎧 VOCALE
// =====================================================
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  try {
    const file = await bot.getFile(msg.voice.file_id);
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const local = path.join(TEMP_DIR, `voice-${Date.now()}.ogg`);
    await downloadToFile(url, local);

    const tr = await openai.audio.transcriptions.create({
      file: fs.createReadStream(local),
      model: "whisper-1",
      language: state.lang
    });
    const text = (tr?.text || "").trim();
    if (!text) {
      console.log("🎧 Whisper vuoto");
      return bot.sendMessage(chatId, "⚙️ Non ho colto bene la tua voce, puoi ripetere?");
    }
    console.log(`🎧 [VOICE] → ${text}`);
    msg.text = text;
    bot.emit("message", msg);
  } catch (e) {
    console.error("❌ Voice error:", e?.message || e);
    bot.sendMessage(chatId, "⚙️ Ho avuto un intoppo sul vocale. Riprova tra poco.");
  }
});
