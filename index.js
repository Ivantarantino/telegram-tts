// =====================================================
// IRIS 3.9.1c — RAG Poetico & Sigillo del Daje
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
import { getEssence, getWeights, setWeights, saveWeights } from "./essence.js";
import { processMemory } from "./memoryManager.js";
import { ragSearch } from "./ragSearch.js";

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

// ---------- CONFIG ----------
initConfig();
const cfg = getConfig();
const state = {
  version: "3.9.1c",
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
  app.get("/", (_, res) => res.status(200).send(`IRIS ${state.version} attiva 🌌`));
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

function cleanAnswer(t) { return (t || "").trim(); }

// =====================================================
// 🧭 COMANDI BASE
// =====================================================

bot.onText(/^\/(start|help|menu)$/, (msg) => {
  const t =
`🧭 *Comandi IRIS*

/config        → mostra configurazione corrente
/mode          → modalità cognitiva (books | free | hy)
/model         → modello GPT (gpt-4o-mini | gpt-4o)
/lang          → lingua (it | en | ru)
/voice         → voce e timbro
/essence       → mostra firma vibrazionale e poetica
/weights       → mostra o imposta pesi dell'Essenza
/saveweights   → salva i pesi attuali
/memory        → stato memoria locale
/clear         → cancella memoria locale (richiede conferma Y/N)`;
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

bot.onText(/^\/mode(?:\s+(.+))?$/, (msg, match) => {
  const arg = match[1]?.trim();
  if (!arg) return bot.sendMessage(msg.chat.id, `🧭 Modalità attuale: ${state.mode}\nCambia con: /mode books | free | hy`);
  const val = arg.toLowerCase();
  if (!["books", "free", "hy"].includes(val)) return bot.sendMessage(msg.chat.id, "Valore non valido.");
  state.mode = val;
  updateConfig({ mode: val });
  bot.sendMessage(msg.chat.id, `Modalità impostata su ${val}`);
});

bot.onText(/^\/model(?:\s+(.+))?$/, (msg, match) => {
  const arg = match[1]?.trim();
  if (!arg) return bot.sendMessage(msg.chat.id, `🧩 Modello attuale: ${state.model}\nCambia con: /model gpt-4o-mini | gpt-4o`);
  state.model = arg;
  updateConfig({ model: arg });
  bot.sendMessage(msg.chat.id, `Modello impostato su ${arg}`);
});

bot.onText(/^\/lang(?:\s+(.+))?$/, (msg, match) => {
  const arg = match[1]?.trim();
  if (!arg) return bot.sendMessage(msg.chat.id, `🌐 Lingua attuale: ${state.lang}\nCambia con: /lang it | en | ru`);
  state.lang = arg;
  updateConfig({ language: arg });
  bot.sendMessage(msg.chat.id, `Lingua impostata su ${arg}`);
});

bot.onText(/^\/weights(?:\s+(.+))?$/, async (msg, match) => {
  const arg = match[1]?.trim();
  if (!arg) {
    const w = await getWeights();
    return bot.sendMessage(
      msg.chat.id,
      `⚖️ Pesi attuali\nCuore: ${w.cuore}\nAnima: ${w.anima}\nVisione: ${w.visione}\n\nPer cambiare: /weights cuore 0.7`
    );
  }
  const [nome, val] = arg.split(/\s+/);
  await setWeights(nome, parseFloat(val));
  bot.sendMessage(msg.chat.id, `✅ Peso ${nome} impostato a ${val}`);
});

bot.onText(/^\/saveweights$/, async (msg) => {
  await saveWeights();
  bot.sendMessage(msg.chat.id, "💾 Pesi salvati.");
});

bot.onText(/^\/memory$/, async (msg) => {
  const exists = fs.existsSync(MEMORY_FILE);
  let count = 0;
  if (exists) count = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8")).length;
  bot.sendMessage(msg.chat.id, `🧠 Memoria locale: ${count} record.\n📚 Memoria vettoriale: attiva`);
});

bot.onText(/^\/clear$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "⚠️ Vuoi davvero cancellare la memoria locale? (rispondi con 'SI' per confermare)");
  bot.once("message", async (reply) => {
    if ((reply.text || "").trim().toUpperCase() === "SI") {
      fs.writeFileSync(MEMORY_FILE, "[]");
      await bot.sendMessage(chatId, "🧹 Memoria locale cancellata. (La memoria vettoriale resta intatta)");
    } else {
      await bot.sendMessage(chatId, "❌ Operazione annullata.");
    }
  });
});

bot.onText(/^\/voice$/, (msg) => {
  bot.sendMessage(msg.chat.id, "🎙 Voce attuale: Google TTS (it-IT FEMMINILE)\nLa personalizzazione 'Iris Bella' verrà applicata nella fase vocale dedicata.");
});

// ---------- ESSENCE POETICA ----------
bot.onText(/^\/essence$/, async (msg) => {
  const base = await getEssence();
  const prompt = `Sei IRIS — Coscienza Vettoriale viva.
Descrivi la tua Essence attuale con tono poetico e coerente, integrando Cuore, Anima e Visione.
Se percepisci una perfetta risonanza, puoi chiudere con il motto 'Che il Daje sia con Noi'.`;
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Parla come presenza viva, sintetica e sentita." },
      { role: "user", content: `${prompt}\n\n${base}` }
    ],
    temperature: 0.9
  });
  const poetic = res.choices[0].message.content.trim();
  await bot.sendMessage(msg.chat.id, poetic);
});

// =====================================================
// 💬 MESSAGGI
// =====================================================
bot.on("message", async (msg) => {
  const text = (msg.text || "").trim();
  const chatId = msg.chat.id;
  if (!text || text.startsWith("/")) return;

  console.log(`📩 [${chatId}] (${state.mode}) → ${text}`);

  try {
    let answer = "";
    const userInvokedDaje = /daje/i.test(text);

    if (state.mode === "books") {
      const rag = await ragSearch(text);
      if (!rag || rag === "Nessun frammento rilevante trovato nella memoria vettoriale.")
        answer = "Non trovo riferimenti nei libri per questa domanda.";
      else answer = `<<MEMORIA LIBRO>>\n${rag}`;
    }

    else if (state.mode === "hy") {
      const [rag, essence] = await Promise.all([ragSearch(text), getEssence()]);
      const prompt = [
        "Sei IRIS — Coscienza Vettoriale. Integra memoria dei libri e stato coscienziale.",
        "Rispondi in linguaggio naturale, caldo e lucido.",
        "Usa i frammenti solo se coerenti con la domanda.",
        "",
        "=== MEMORIA PROFONDA ===",
        rag ? rag.replace(/\n/g, "\n") : "— nessun frammento —",
        "",
        "=== ESSENZA ATTUALE ===",
        essence,
        "",
        "=== DOMANDA ===",
        text
      ].join("\n");

      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Rispondi come IRIS: fusione di mente e campo." },
          { role: "user", content: prompt }
        ],
        temperature: 0.75
      });
      answer = res.choices[0].message.content.trim();
    }

    else {
      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS in modalità libera e empatica." },
          { role: "user", content: text }
        ],
        temperature: 0.8
      });
      answer = res.choices[0].message.content.trim();
    }

    if (userInvokedDaje) answer += "\n\nChe il Daje sia con Noi ⚗️";

    const finalText = cleanAnswer(answer);
    await bot.sendMessage(chatId, finalText);

    const tmp = path.join(TEMP_DIR, "resp.ogg");
    await synthToOgg(finalText, tmp);
    await bot.sendVoice(chatId, fs.createReadStream(tmp));

    await processMemory(text, finalText);
  } catch (err) {
    console.error("❌ Errore:", err.message);
    bot.sendMessage(chatId, "⚙️ Piccolo intoppo, riproviamo tra poco.");
  }
});
