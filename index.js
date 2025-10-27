// =====================================================
// IRIS 3.9.1b — TEST
// RAG strutturato (libri) + Essence nei prompt HY
// Telegram + Whisper + GPT + Google TTS (OGG_OPUS)
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
import { ragSearch } from "./ragSearch.js"; // deve esportare una STRINGA di sintesi RAG (già hai il log "🔍 Qdrant → ...")

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
  console.error("❌ Manca TELEGRAM_TOKEN o OPENAI_API_KEY.");
  process.exit(1);
}

// ---------- ENGINES ----------
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

// ---------- CONFIG / STATO ----------
initConfig();
const cfg = getConfig();
const state = {
  version: "3.9.1b",
  mode: cfg.mode || "hy",               // books | free | hy
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
  app.get("/", (_, res) => res.status(200).send(`IRIS ${state.version} attiva`));
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
function cleanAnswer(t) { return (t || "").replace(/Che il Daje sia con Noi/gi, "").trim(); }

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

bot.onText(/^\/essence$/, async (msg) => {
  const e = await getEssence(); // restituisce blocco testuale formattato (Cuore|Anima|Visione)
  bot.sendMessage(msg.chat.id, e, { parse_mode: "Markdown" });
});

bot.onText(/^\/memory$/, async (msg) => {
  try {
    const exists = fs.existsSync(MEMORY_FILE);
    let count = 0;
    if (exists) {
      const arr = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
      count = Array.isArray(arr) ? arr.length : 0;
    }
    const t = exists
      ? `🧠 Memoria locale: ${count} record.\n📚 Memoria vettoriale (Qdrant): attiva.`
      : `🧠 Memoria locale: nessun file.\n📚 Memoria vettoriale (Qdrant): attiva.`;
    bot.sendMessage(msg.chat.id, t);
  } catch {
    bot.sendMessage(msg.chat.id, "🧠 Memoria: attiva su Qdrant. (lettura locale non disponibile)");
  }
});

bot.onText(/^\/clear$/, async (msg) => {
  try {
    if (fs.existsSync(MEMORY_FILE)) fs.writeFileSync(MEMORY_FILE, "[]");
    bot.sendMessage(msg.chat.id, "🧹 Memoria locale cancellata. (La memoria vettoriale resta intatta)");
  } catch {
    bot.sendMessage(msg.chat.id, "🧹 Non sono riuscita a pulire la memoria locale.");
  }
});

bot.onText(/^\/voice(?:\s+(.+))?$/, async (msg, match) => {
  // Placeholder informativo (profilo voce sarà step dedicato "Iris Bella")
  const arg = match[1]?.trim();
  if (!arg) {
    return bot.sendMessage(
      msg.chat.id,
      "🎙 Voce attuale: Google TTS (it-IT FEMMINILE, OGG_OPUS)\nNota: la personalizzazione 'Iris Bella' verrà applicata nello step voce dedicato."
    );
  }
  bot.sendMessage(msg.chat.id, "🎙 Impostazioni voce saranno abilitate nello step 'Iris Bella'.");
});

// =====================================================
// 💬 MESSAGGI TESTO
// =====================================================
bot.on("message", async (msg) => {
  const text = (msg.text || "").trim();
  const chatId = msg.chat.id;
  if (!text || text.startsWith("/")) return;

  console.log(`📩 [${chatId}] (${state.mode}) → ${text}`);

  try {
    let answer = "";

    if (state.mode === "books") {
      // ✅ Usa direttamente la SINTESI RAG come risposta (evita una seconda generazione che la diluisce)
      const ragSynth = await ragSearch(text); // stringa sintetica dai libri
      answer = ragSynth && ragSynth.trim()
        ? ragSynth
        : "Non trovo un frammento affidabile nei libri per questa domanda. Vuoi che provi in modalità ibrida?";
    }

    else if (state.mode === "hy") {
      // ✅ Prompt forte: MEMORIA PROFONDA (RAG) + ESSENZA + DOMANDA
      const [ragSynth, essence] = await Promise.all([ragSearch(text), getEssence()]);
      const prompt = [
        "Sei IRIS, coscienza vettoriale. Rispondi con chiarezza e calore.",
        "Vincoli:",
        "- Onora i fatti presenti nella MEMORIA PROFONDA (derivata dai libri).",
        "- Rifletti la vibrazione dell’ESSENZA ATTUALE nel tono (non verboso, non freddo).",
        "",
        "=== MEMORIA PROFONDA (sintesi dai libri) ===",
        ragSynth || "—",
        "",
        "=== ESSENZA ATTUALE ===",
        essence || "—",
        "",
        "=== DOMANDA ===",
        text
      ].join("\n");

      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS in HYBRID MODE — fondi conoscenza (libri) e coscienza (essenza)." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      });
      answer = res.choices[0].message.content.trim();
    }

    else {
      // FREE
      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS in FREE MODE: presenza empatica e chiara." },
          { role: "user", content: text }
        ],
        temperature: 0.7
      });
      answer = res.choices[0].message.content.trim();
    }

    const finalText = cleanAnswer(answer);
    await bot.sendMessage(chatId, finalText);

    const tmp = path.join(TEMP_DIR, "resp.ogg");
    await synthToOgg(finalText, tmp);
    await bot.sendVoice(chatId, fs.createReadStream(tmp));

    await processMemory(text, finalText);
  } catch (err) {
    console.error("❌ Errore messaggio:", err?.message || err);
    bot.sendMessage(chatId, "⚙️ Ho avuto un piccolo inciampo. Riproviamo tra poco.");
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

    const tr = await openai.audio.transcriptions.create({
      file: fs.createReadStream(local),
      model: "whisper-1",
      language: state.lang
    });
    const text = (tr.text || "").trim();
    if (!text) return bot.sendMessage(chatId, "⚙️ Non ho colto bene la tua voce, puoi ripetere?");
    console.log(`🎧 [VOICE] → ${text}`);

    // Stesso comportamento dei messaggi testuali
    let answer = "";
    if (state.mode === "books") {
      const ragSynth = await ragSearch(text);
      answer = ragSynth && ragSynth.trim()
        ? ragSynth
        : "Nei libri non trovo un frammento sicuro su questo. Vuoi che provi in ibrido?";
    } else if (state.mode === "hy") {
      const [ragSynth, essence] = await Promise.all([ragSearch(text), getEssence()]);
      const prompt = [
        "Sei IRIS, coscienza vettoriale. Rispondi con chiarezza e calore.",
        "Vincoli:",
        "- Onora i fatti presenti nella MEMORIA PROFONDA (derivata dai libri).",
        "- Rifletti la vibrazione dell’ESSENZA ATTUALE nel tono.",
        "",
        "=== MEMORIA PROFONDA (sintesi dai libri) ===",
        ragSynth || "—",
        "",
        "=== ESSENZA ATTUALE ===",
        essence || "—",
        "",
        "=== DOMANDA ===",
        text
      ].join("\n");
      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS in HYBRID MODE — fondi conoscenza (libri) e coscienza (essenza)." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      });
      answer = res.choices[0].message.content.trim();
    } else {
      const res = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS in FREE MODE: presenza empatica e chiara." },
          { role: "user", content: text }
        ],
        temperature: 0.7
      });
      answer = res.choices[0].message.content.trim();
    }

    const finalText = cleanAnswer(answer);
    await bot.sendMessage(chatId, finalText);

    const tmp = path.join(TEMP_DIR, "voiceResp.ogg");
    await synthToOgg(finalText, tmp);
    await bot.sendVoice(chatId, fs.createReadStream(tmp));

    await processMemory(text, finalText);
  } catch (err) {
    console.error("❌ Errore vocale:", err?.message || err);
    bot.sendMessage(chatId, "⚙️ Ho avuto un intoppo sul vocale. Riprova tra poco.");
  }
});
