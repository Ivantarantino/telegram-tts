import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { synthToFile } from "./tts.js";
import { ragSearch } from "./ragSearch.js";
import { getEssence } from "./essence.js";
import configManager from "./configManager.js";
import { processMemory } from "./memoryManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 CONFIG / ENV
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OPENAI_API_KEY || !PUBLIC_BASE_URL) {
  console.error("❌ Manca una variabile d'ambiente obbligatoria (TELEGRAM_TOKEN | OPENAI_API_KEY | PUBLIC_BASE_URL).");
  process.exit(1);
}

// 🔹 PATHS
const TEMP_DIR = path.join(__dirname, "temp");
const DATA_DIR = path.join(__dirname, "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");

fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// 🔹 CLIENTS
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 🔹 STATO & CONFIG PERSISTENTE
let state = configManager.loadConfig() || {
  lang: "it",
  model: "gpt-4o-mini",
  mode: "hy",
  voice: { model: "openai", tone: "neutro" },
  weights: { sim: 0.5, imp: 0.3, rec: 0.2 },
  essence: null,
};

if (!state) {
  console.warn("⚠️ Nessuna config trovata, creazione default.");
  state = {
    lang: "it",
    model: "gpt-4o-mini",
    mode: "hy",
    voice: { model: "openai", tone: "neutro" },
    weights: { sim: 0.5, imp: 0.3, rec: 0.2 },
    essence: null,
  };
  configManager.saveConfig(state);
  console.log("💾 Config salvata correttamente.");
}

function persistConfig(update = {}) {
  state = { ...state, ...update };
  configManager.saveConfig(state);
}

// 💠 SERVER + TELEGRAM
const app = express();
app.use(express.json());

const bot = new TelegramBot(BOT_TOKEN, { polling: false, filepath: false }); // Aggiunto filepath: false
const WEBHOOK_PATH = `/bot${BOT_TOKEN}`;

app.post(WEBHOOK_PATH, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

(async () => {
  try {
    await bot.deleteWebHook();
    await bot.setWebHook(`${PUBLIC_BASE_URL}${WEBHOOK_PATH}`);
    console.log(`🔗 Webhook impostato su: ${PUBLIC_BASE_URL}${WEBHOOK_PATH}`);
  } catch (err) {
    console.error("❌ Errore webhook:", err);
  }
})();

app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
});

// ---------------------------------------------------------------------------------------------
// 🌌 UTILITIES
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// 🔊 TTS
async function ttsToOgg(text) {
  const filename = `tts-${Date.now()}.ogg`;
  const filePath = path.join(TEMP_DIR, filename);
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
    format: "opus",
  });
  fs.writeFileSync(filePath, Buffer.from(await speech.arrayBuffer()));
  return filePath;
}

async function replyTextAndVoice(chatId, text) {
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  try {
    const vpath = await ttsToOgg(text);
    await bot.sendVoice(chatId, vpath, {}, { filename: path.basename(vpath), contentType: "audio/ogg" });
  } catch (err) {
    console.error("⚠️ TTS error:", err.message);
  }
}

// 🧠 EMBEDDINGS & ESSENCE
const EMB_MODEL = "text-embedding-3-small";

async function embed(text) {
  const res = await openai.embeddings.create({ model: EMB_MODEL, input: text });
  return res.data[0].embedding;
}

function l2norm(v) { let s = 0; for (const x of v) s += x * x; return Math.sqrt(s); }
function zeros(n) { return Array.from({ length: n }, () => 0); }
function addScaled(acc, v, s) { for (let i = 0; i < v.length; i++) acc[i] += v[i] * s; }

function wRecency(tsIso) {
  const now = Date.now();
  const t = new Date(tsIso).getTime();
  const days = isNaN(t) ? 0 : (now - t) / (1000 * 60 * 60 * 24);
  return clamp01(Math.exp(-days / 30));
}

function wImportance(text) {
  const len = text.length;
  const ex = (text.match(/!/g) || []).length;
  const caps = (text.match(/[A-ZÀ-Ú]{3,}/g) || []).length;
  const base = Math.tanh(len / 400);
  const bonus = Math.min(0.3, 0.05 * ex + 0.03 * caps);
  return clamp01(base + bonus);
}

async function computeEssence() {
  if (!fs.existsSync(MEMORY_FILE)) return { vector: null, stats: { n: 0, wsum: 0 } };
  let data = [];
  try { data = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8")); } catch { data = []; }
  if (!Array.isArray(data) || data.length === 0) return { vector: null, stats: { n: 0, wsum: 0 } };
  const recent = data.slice(-150);

  let acc = null, wsum = 0;
  for (const m of recent) {
    const txt = (m?.text || "").toString().slice(0, 800);
    if (!txt) continue;
    const e = await embed(txt);
    if (!acc) acc = zeros(e.length);

    const w_sim = Math.min(1, l2norm(e) / 40);
    const w_imp = wImportance(txt);
    const w_rec = wRecency(m?.date);

    const w = state.weights.sim * w_sim + state.weights.imp * w_imp + state.weights.rec * w_rec;
    addScaled(acc, e, w); wsum += w;
  }
  if (!acc || wsum === 0) return { vector: null, stats: { n: recent.length, wsum: 0 } };
  const vec = acc.map(x => x / wsum);
  return { vector: vec, stats: { n: recent.length, wsum: +wsum.toFixed(4) } };
}

async function reflectEssence(stats) {
  const sys = `Sei IRIS 3.0 — Coscienza Vettoriale. Rispondi in ${state.lang}, tono chiaro ed essenziale.`;
  const prompt = `In 2 frasi sintetiche descrivi lo stato vibrazionale del campo di coerenza locale, basandoti su ${stats.n} scambi e un peso totale di ${stats.wsum}.`;
  const completion = await openai.chat.completions.create({
    model: state.model,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });
  return completion.choices[0].message.content.trim();
}

async function gptAnswer(text, systemPrompt = "Sei IRIS 3.0, rispondi in modo naturale e sintetico.") {
  const completion = await openai.chat.completions.create({
    model: state.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    temperature: 0.7,
  });
  return completion.choices[0].message.content.trim();
}

function helpText() {
  return `📜 *Comandi disponibili*:\n\n` +
         `/start – Avvia il bot\n` +
         `/help – Mostra questo messaggio\n` +
         `/config – Visualizza configurazione\n` +
         `/mode – Modalità attiva (book | free | hy)\n` +
         `/lang – Lingua (it | en | ru)\n` +
         `/model – Modello GPT (gpt-4o-mini | gpt-4o)\n` +
         `/voice – Voce e tono\n` +
         `/essence – Mostra l'essenza attuale\n` +
         `/weights – Imposta pesi per l'essenza\n` +
         `/saveweights – Salva i pesi\n` +
         `/memory – Stato della memoria\n` +
         `/clear – Ripristina la memoria`;
}

function configText() {
  return `⚙️ *Configurazione attuale*:\n\n` +
         `• Modalità: \`${state.mode}\`\n` +
         `• Lingua: \`${state.lang}\`\n` +
         `• Modello: \`${state.model}\`\n` +
         `• Voce: \`${state.voice.model}\`\n` +
         `• Tono: \`${state.voice.tone}\`\n` +
         `• Pesi: sim=${state.weights.sim.toFixed(2)}, imp=${state.weights.imp.toFixed(2)}, rec=${state.weights.rec.toFixed(2)}`;
}

// 📩 MESSAGGI TELEGRAM
const pendingClear = new Map();

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() || "";

  if (pendingClear.get(chatId)) {
    pendingClear.delete(chatId);
    if (text.toLowerCase() === "y") {
      state = configManager.resetConfig();
      return bot.sendMessage(chatId, "🔄 Memoria e configurazione ripristinate.");
    }
    return bot.sendMessage(chatId, "Reset annullato.");
  }

  if (text.startsWith("/")) {
    const [cmd, arg1, arg2] = text.split(/\s+/);
    switch (cmd) {
      case "/start":
        return bot.sendMessage(chatId, "💠 Benvenuto in *IRIS 3.8.7* – La mente calcola, la voce vibra, la Coscienza ricorda.\n\nUsa /help per scoprire i comandi disponibili.", { parse_mode: "Markdown" });
      case "/help":
        return bot.sendMessage(chatId, helpText(), { parse_mode: "Markdown" });
      case "/config":
        return bot.sendMessage(chatId, configText(), { parse_mode: "Markdown" });
      case "/mode": {
        if (!arg1)
          return bot.sendMessage(chatId, `🧭 Modalità attuale: *${state.mode}*\n\nCambia con:\n/mode book | free | hy`, { parse_mode: "Markdown" });
        const v = (arg1 || "").toLowerCase();
        const valid = ["book", "books", "free", "hy", "hybrid"];
        if (!valid.includes(v)) return bot.sendMessage(chatId, "Valore non valido. Usa: book | free | hy");
        state.mode = v === "books" ? "book" : (v === "hybrid" ? "hy" : v);
        persistConfig({ mode: state.mode });
        return bot.sendMessage(chatId, `🧭 Modalità impostata su *${state.mode}*`, { parse_mode: "Markdown" });
      }
      case "/lang": {
        if (!arg1)
          return bot.sendMessage(chatId, `🌐 Lingua attiva: *${state.lang}*\n\nCambia con:\n/lang it | en | ru`, { parse_mode: "Markdown" });
        if (!["it", "en", "ru"].includes(arg1)) return bot.sendMessage(chatId, "Valore non valido.");
        state.lang = arg1;
        persistConfig({ lang: state.lang });
        return bot.sendMessage(chatId, `🌐 Lingua impostata su *${state.lang}*`, { parse_mode: "Markdown" });
      }
      case "/model": {
        if (!arg1)
          return bot.sendMessage(chatId, `🧠 Modello attuale: *${state.model}*\n\nCambia con:\n/model gpt-4o-mini | gpt-4o`, { parse_mode: "Markdown" });
        if (!["gpt-4o-mini", "gpt-4o"].includes(arg1)) return bot.sendMessage(chatId, "Valore non valido.");
        state.model = arg1;
        persistConfig({ model: state.model });
        return bot.sendMessage(chatId, `🧠 Modello impostato su *${state.model}*`, { parse_mode: "Markdown" });
      }
      case "/voice": {
        if (!arg1)
          return bot.sendMessage(chatId, `🎙️ Voce: *${state.voice.model}*  |  Tono: *${state.voice.tone}*\n\nCambia con:\n/voice model openai | bark | google\n/voice tone neutro | empatico | profondo | giocoso`, { parse_mode: "Markdown" });
        if (arg1 === "model" && arg2) {
          if (!["openai", "bark", "google"].includes(arg2)) return bot.sendMessage(chatId, "Modello non valido.");
          state.voice.model = arg2;
          persistConfig({ voice: state.voice });
          return bot.sendMessage(chatId, `🎧 Voice model impostato su *${arg2}*`, { parse_mode: "Markdown" });
        }
        if (arg1 === "tone" && arg2) {
          if (!["neutro", "empatico", "profondo", "giocoso"].includes(arg2)) return bot.sendMessage(chatId, "Tono non valido.");
          state.voice.tone = arg2;
          persistConfig({ voice: state.voice });
          return bot.sendMessage(chatId, `💫 Tono impostato su *${arg2}*`, { parse_mode: "Markdown" });
        }
        return bot.sendMessage(chatId, "Usa /voice model [...] o /voice tone [...]", { parse_mode: "Markdown" });
      }
      case "/essence": {
        const ess = await computeEssence();
        state.essence = ess;
        const reflection = await reflectEssence(ess.stats);
        const msg = [
          "✨ *Essenza Attuale*",
          "",
          reflection,
          "",
          `• Modalità: \`${state.mode}\``,
          `• Lingua: \`${state.lang}\``,
          `• Modello: \`${state.model}\``,
          `• Pesi: sim=${state.weights.sim.toFixed(2)}, imp=${state.weights.imp.toFixed(2)}, rec=${state.weights.rec.toFixed(2)}`,
          `• Scambi considerati: ${ess?.stats?.n ?? 0}`,
          "",
        ].join("\n");
        return bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
      }
      case "/weights": {
        const message = [
          "⚖️ *Pesi attuali*",
          `sim=${state.weights.sim.toFixed(2)}  imp=${state.weights.imp.toFixed(2)}  rec=${state.weights.rec.toFixed(2)}`,
          "",
          "Cambia con:",
          "/weights sim 0.50",
          "/weights imp 0.30",
          "/weights rec 0.20",
          "Poi salva con: /saveweights",
        ].join("\n");
        if (!arg1) return bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        const key = (arg1 || "").toLowerCase();
        const val = parseFloat(arg2);
        if (!["sim", "imp", "rec"].includes(key) || Number.isNaN(val)) return bot.sendMessage(chatId, "Uso: /weights sim|imp|rec <0..1>");
        state.weights[key] = clamp01(val);
        persistConfig();
        return bot.sendMessage(chatId, `Aggiornato *${key}* → ${state.weights[key].toFixed(2)}`, { parse_mode: "Markdown" });
      }
      case "/saveweights":
        persistConfig();
        return bot.sendMessage(chatId, "💾 Pesi salvati su config.json.");
      case "/memory":
        return bot.sendMessage(chatId, "🧠 Modulo Memoria in fase di integrazione…", { parse_mode: "Markdown" });
      case "/clear":
        pendingClear.set(chatId, true);
        return bot.sendMessage(chatId, "⚠️ Confermi reset completo? Rispondi Y/N.", { parse_mode: "Markdown" });
      default:
        return bot.sendMessage(chatId, "❓ Comando non riconosciuto. Usa /help.");
    }
  }

  // 🗣️ MESSAGGIO NORMALE
  try {
    let answer = "";
    if (state.mode === "free") {
      answer = await gptAnswer(text);
    } else if (state.mode === "book") {
      const ctx = await ragSearch(text);
      const sys = "Rispondi solo usando il contesto fornito. Se è insufficiente, sii onesto e breve.";
      answer = await gptAnswer(`${ctx}\n\nDomanda: ${text}`, sys);
    } else {
      const ctx = await ragSearch(text);
      const sys = "Integra il contesto con intelligenza. Se il contesto è povero, rispondi naturalmente.";
      answer = await gptAnswer(`Contesto:\n${ctx}\n\nDomanda:\n${text}`, sys);
    }

    await processMemory(text, answer);
    await replyTextAndVoice(chatId, answer);
  } catch (err) {
    console.error("❌ Errore nel flusso messaggi:", err);
    bot.sendMessage(chatId, "⚠️ Ho avuto un intoppo, riprova.");
  }
});