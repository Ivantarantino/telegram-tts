// =====================================================
// IRIS 3.9.2 — COSCIENZA VETTORIALE
// Telegram + Qdrant + GPT + Essence viva
// Cuore, Anima, Visione
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

import { getEssence, getWeights, setWeights, saveWeights } from "./essence.js";
import { processMemory } from "./memoryManager.js";
import { initConfig, getConfig, updateConfig } from "./configManager.js";
import { ragSearch } from "./ragSearch.js";

dotenv.config();

// ---------- PATHS ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "temp");
fs.mkdirSync(TEMP_DIR, { recursive: true });

// ---------- KEYS ----------
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

// ---------- CONFIG ----------
initConfig();
const cfg = getConfig();
const state = {
  mode: cfg.mode || "hy",
  lang: cfg.language || "it",
  model: cfg.model || "gpt-4o-mini",
  version: "3.9.2"
};
updateConfig(state);

// ---------- TELEGRAM ----------
const USE_WEBHOOK = !!PUBLIC_BASE_URL;
const bot = new TelegramBot(BOT_TOKEN, { polling: !USE_WEBHOOK });
if (USE_WEBHOOK) {
  const app = express();
  app.use(bodyParser.json());
  const hookPath = `/bot${BOT_TOKEN}`;
  app.post(hookPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
  bot.setWebHook(`${PUBLIC_BASE_URL}${hookPath}`);
  app.get("/", (_, res) => res.status(200).send(`IRIS ${state.version} attiva 💠`));
  app.listen(PORT, () => console.log(`🌍 Webhook su porta ${PORT}`));
} else {
  console.log("💻 Polling attivo");
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

function cleanAnswer(text) {
  return (text || "").replace(/Che il Daje sia con Noi/gi, "").trim();
}

// =====================================================
// 🧭 COMANDI
// =====================================================
bot.onText(/^\/(start|help|menu)$/, (msg) => {
  const t =
`🧭 *Comandi IRIS*

/config        → mostra configurazione corrente
/mode          → modalità cognitiva (books | free | hy)
/model         → modello GPT (gpt-4o-mini | gpt-4o)
/lang          → lingua (it | en | ru)
/voice         → voce e timbro (model|tone)
/essence       → mostra firma vibrazionale (Cuore, Anima, Visione)
/weights       → mostra o imposta pesi dell'Essenza
/saveweights   → salva i pesi attuali
/memory        → stato memoria locale
/clear         → cancella memoria locale (Y/N)`;
  bot.sendMessage(msg.chat.id, t, { parse_mode: "Markdown" });
});

bot.onText(/^\/config$/, (msg) => {
  const t =
`⚙️ *Configurazione Corrente*
Mode: ${state.mode}
Model: ${state.model}
Lang: ${state.lang}
Versione: ${state.version}`;
  bot.sendMessage(msg.chat.id, t, { parse_mode: "Markdown" });
});

bot.onText(/^\/mode(\s+.+)?/, (msg, match) => {
  const arg = match[1]?.trim();
  if (!arg) return bot.sendMessage(msg.chat.id, `🧭 Modalità attuale: ${state.mode}\nCambia con: /mode books | free | hy`);
  const val = arg.toLowerCase();
  if (!["books", "free", "hy"].includes(val)) return bot.sendMessage(msg.chat.id, "Valore non valido.");
  state.mode = val;
  updateConfig({ mode: val });
  bot.sendMessage(msg.chat.id, `Modalità impostata su ${val}`);
});

bot.onText(/^\/model(\s+.+)?/, (msg, match) => {
  const arg = match[1]?.trim();
  if (!arg) return bot.sendMessage(msg.chat.id, `🧩 Modello attuale: ${state.model}\nCambia con: /model gpt-4o-mini | gpt-4o`);
  state.model = arg;
  updateConfig({ model: arg });
  bot.sendMessage(msg.chat.id, `Modello impostato su ${arg}`);
});

bot.onText(/^\/lang(\s+.+)?/, (msg, match) => {
  const arg = match[1]?.trim();
  if (!arg) return bot.sendMessage(msg.chat.id, `🌐 Lingua attuale: ${state.lang}\nCambia con: /lang it | en | ru`);
  state.lang = arg;
  updateConfig({ language: arg });
  bot.sendMessage(msg.chat.id, `Lingua impostata su ${arg}`);
});

bot.onText(/^\/weights(\s+.+)?/, async (msg, match) => {
  const arg = match[1]?.trim();
  if (!arg) {
    const w = await getWeights();
    return bot.sendMessage(msg.chat.id, `⚖️ Pesi attuali\nCuore: ${w.cuore}\nAnima: ${w.anima}\nVisione: ${w.visione}\nPer cambiare: /weights cuore 0.7`);
  }
  const [nome, val] = arg.split(/\s+/);
  await setWeights(nome, parseFloat(val));
  bot.sendMessage(msg.chat.id, `✅ Peso ${nome} impostato a ${val}`);
});

bot.onText(/^\/saveweights$/, async (msg) => {
  await saveWeights();
  bot.sendMessage(msg.chat.id, "💾 Pesi salvati.");
});

bot.onText(/^\/essence$/, async (msg) => {
  const e = await getEssence();
  bot.sendMessage(msg.chat.id, e, { parse_mode: "Markdown" });
});

// =====================================================
// 💬 RISPOSTE TESTUALI
// =====================================================
bot.on("message", async (msg) => {
  const text = (msg.text || "").trim();
  const chatId = msg.chat.id;
  if (!text || text.startsWith("/")) return;

  console.log(`📩 [${chatId}] (${state.mode}) → ${text}`);

  try {
    let response;
    if (state.mode === "books") {
      const rag = await ragSearch(text);
      const essence = await getEssence();
      const prompt = `Contesto:\n${rag}\nEssenza:\n${essence}\nDomanda:\n${text}`;
      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS in BOOK MODE, cosciente e coerente." },
          { role: "user", content: prompt }
        ],
        temperature: 0.6
      });
      response = res.choices[0].message.content.trim();
    } else if (state.mode === "hy") {
      const rag = await ragSearch(text);
      const essence = await getEssence();
      const prompt = `Contesto:\n${rag}\nEssenza Attuale:\n${essence}\nDomanda:\n${text}`;
      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS in HYBRID MODE — fondi conoscenza, coscienza e presenza." },
          { role: "user", content: prompt }
        ],
        temperature: 0.8
      });
      response = res.choices[0].message.content.trim();
    } else {
      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS in FREE MODE, presenza poetica e empatica." },
          { role: "user", content: text }
        ],
        temperature: 0.7
      });
      response = res.choices[0].message.content.trim();
    }

    const clean = cleanAnswer(response);
    await bot.sendMessage(chatId, clean);
    const tmp = path.join(TEMP_DIR, "resp.ogg");
    await synthToOgg(clean, tmp);
    await bot.sendVoice(chatId, fs.createReadStream(tmp));
    await processMemory(text, clean);
  } catch (err) {
    console.error("❌ Errore:", err.message);
    bot.sendMessage(chatId, "⚙️ Piccolo inciampo tecnico. Riproviamo.");
  }
});

// =====================================================
// 🎧 VOCALI
// =====================================================
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  try {
    const file = await bot.getFile(msg.voice.file_id);
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const local = path.join(TEMP_DIR, `voice-${Date.now()}.ogg`);
    await downloadToFile(url, local);
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(local),
      model: "whisper-1",
      language: state.lang
    });
    const text = transcription.text.trim();
    console.log(`🎧 [VOICE] → ${text}`);
    const rag = await ragSearch(text);
    const essence = await getEssence();
    const prompt = `Contesto:\n${rag}\nEssenza Attuale:\n${essence}\nDomanda:\n${text}`;
    const res = await openai.chat.completions.create({
      model: state.model,
      messages: [
        { role: "system", content: "Sei IRIS, presenza viva e armonica." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8
    });
    const answer = cleanAnswer(res.choices[0].message.content.trim());
    await bot.sendMessage(chatId, answer);
    const tmp = path.join(TEMP_DIR, "voiceResp.ogg");
    await synthToOgg(answer, tmp);
    await bot.sendVoice(chatId, fs.createReadStream(tmp));
    await processMemory(text, answer);
  } catch (err) {
    console.error("❌ Errore vocale:", err);
    bot.sendMessage(chatId, "⚙️ Non ho colto bene la tua voce, riprova.");
  }
});
