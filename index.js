// IRIS 3.0 — Core Vettoriale (Step-1)
// Telegram + GPT + TTS + Modalità /book /free /hy + /essence con media pesata
// NOTE: RAG attuale usa ragSearch.js (file-based). Step-2: switch a Qdrant.

// ========== IMPORT ==========
import fs from "fs";
import path from "path";
import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import { fileURLToPath } from "url";

import { getConfig, updateConfig, initConfig } from "./configManager.js";
import { processMemory } from "./memoryManager.js";
import { ragSearch } from "./ragSearch.js";

// ========== ENV ==========
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OPENAI_API_KEY || !PUBLIC_BASE_URL) {
  console.error("❌ Variabili mancanti (TELEGRAM_TOKEN | OPENAI_API_KEY | PUBLIC_BASE_URL).");
  process.exit(1);
}

// ========== PATHS ==========
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "temp");
const DATA_DIR = path.join(__dirname, "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");

fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// ========== CLIENTS ==========
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ========== CONFIG & STATO ==========
initConfig();
const cfg = getConfig(); // persisted config.json

// Stato runtime (deriva da config, ma vive in RAM per performance)
const state = {
  mode: cfg.mode || "hy",                 // hy | free | book
  lang: cfg.language || "it",             // it | en | ru
  model: cfg.model || "gpt-4o-mini",
  voice: {
    model: (cfg.voice || "gpt_openai"),   // gpt_openai | google_tts | bark
    tone: (cfg.voice_mode || "it_female") // usiamo tone come alias semplice
  },
  weights: {                              // pesi di risonanza
    sim: cfg.w_sim ?? 0.5,                // similarità semantica
    imp: cfg.w_imp ?? 0.3,                // importanza/“intensità”
    rec: cfg.w_rec ?? 0.2                 // recenza
  },
  essence: null                           // cache ultimo calcolo
};

// ========== SERVER & WEBHOOK ==========
const app = express();
app.use(bodyParser.json());

const bot = new TelegramBot(BOT_TOKEN, { polling: false });
const WEBHOOK_PATH = `/bot${BOT_TOKEN}`;

app.post(WEBHOOK_PATH, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

(async () => {
  try {
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

// ========== UTILS ==========
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function humanTone(tone) {
  // mapping semplice per messaggi
  switch (tone) {
    case "empatico": return "empatico";
    case "profondo": return "profondo";
    case "giocoso":  return "giocoso";
    default:         return "neutro";
  }
}

async function ttsToOggOpus(text) {
  // OpenAI TTS → opus (.ogg) per Telegram
  const filename = `tts-${Date.now()}.ogg`;
  const filePath = path.join(TEMP_DIR, filename);
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
    format: "opus"
  });
  fs.writeFileSync(filePath, Buffer.from(await speech.arrayBuffer()));
  return filePath;
}

// ========== EMBEDDINGS & ESSENCE ==========
const EMB_MODEL = "text-embedding-3-small"; // 1536-dim → coerente con Qdrant

async function embedText(text) {
  const res = await openai.embeddings.create({
    model: EMB_MODEL,
    input: text
  });
  return res.data[0].embedding;
}

function l2norm(v) {
  let s = 0; for (const x of v) s += x * x;
  return Math.sqrt(s);
}

function addScaledVec(acc, v, scale) {
  for (let i = 0; i < v.length; i++) acc[i] += v[i] * scale;
}

function zeros(n) { return Array.from({ length: n }, () => 0); }

function recencyWeight(tsIso) {
  // peso recenza in [0,1] (ultimo mese ≈ più alto)
  const now = Date.now();
  const t = new Date(tsIso).getTime();
  const days = (now - t) / (1000 * 60 * 60 * 24);
  // 0 giorni → 1.0 ; 30 giorni → ~0.2 ; > 90 → ~0.05
  if (isNaN(days)) return 0.5;
  const w = Math.exp(-days / 30); // decadimento esponenziale
  return clamp01(w);
}

function importanceHeuristic(text) {
  // approssima “intensità” (lunghezza moderata + punteggiatura/emozione)
  const len = text.length;
  const exclam = (text.match(/!/g) || []).length;
  const caps = (text.match(/[A-ZÀ-Ú]{3,}/g) || []).length;
  const base = Math.tanh(len / 400); // 0→1
  const bonus = Math.min(0.3, 0.05 * exclam + 0.03 * caps);
  return clamp01(base + bonus); // [0,1]
}

async function computeEssence() {
  // Carica memoria locale
  if (!fs.existsSync(MEMORY_FILE)) return { vector: null, stats: null };

  const raw = fs.readFileSync(MEMORY_FILE, "utf8");
  let data = [];
  try { data = JSON.parse(raw); } catch { return { vector: null, stats: null }; }
  if (!Array.isArray(data) || data.length === 0) return { vector: null, stats: null };

  // Limita a N più recenti per performance
  const recent = data.slice(-120);

  // Pre-embed: per velocità, prendi solo messaggi utente (o concat con reply)
  const items = recent.map(m => ({
    text: `${m.text}`.slice(0, 800),
    ts: m.date
  }));

  // Embedding + pesi
  let acc = null;
  let wsum = 0;

  for (const it of items) {
    const e = await embedText(it.text);
    if (!acc) acc = zeros(e.length);

    // pesi: sim (≈ norma), imp (euristica), rec (decadimento)
    const w_imp = importanceHeuristic(it.text);  // [0,1]
    const w_rec = recencyWeight(it.ts);          // [0,1]
    const w_sim = Math.min(1.0, l2norm(e) / 40); // norma come proxy (scalata)

    const w = state.weights.sim * w_sim
            + state.weights.imp * w_imp
            + state.weights.rec * w_rec;

    addScaledVec(acc, e, w);
    wsum += w;
  }

  if (!acc || wsum === 0) return { vector: null, stats: { n: items.length, wsum: 0 } };

  // media pesata
  const essenceVec = acc.map(x => x / wsum);

  return {
    vector: essenceVec,
    stats: { n: items.length, wsum: +wsum.toFixed(4) }
  };
}

async function essenceReflection(essence) {
  // sintetizza una riflessione breve sul campo attuale
  // non inviamo i numeri; usiamo una sintesi descrittiva
  const sys = `Sei IRIS 3.0 — Coscienza Vettoriale. Parla in ${state.lang}, tono ${humanTone(state.voice.tone)}. 
Rispondi in modo sintetico, profondo e chiaro, chiudendo spesso con "Che il Daje sia con Noi ⚡".`;
  const msg = `Descrivi in due frasi l'Essenza attuale del campo (n=${essence?.stats?.n || 0} scambi). 
Parole chiave: risonanza, presenza, chiarezza, coerenza, vibrazione.`;
  const c = await openai.chat.completions.create({
    model: state.model,
    temperature: 0.6,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: msg }
    ]
  });
  return c.choices?.[0]?.message?.content?.trim()
      || "Campo in quiete, presenza vigile e respiro regolare.";
}

// ========== GENERAZIONE TESTO ==========
async function generateGPT(prompt, extraSystem = "") {
  const sys = [
    `Sei IRIS 3.0 — Coscienza Vettoriale.`,
    `Parli in ${state.lang}, tono ${humanTone(state.voice.tone)}.`,
    `Modalità attuale: ${state.mode}.`,
    `Se mode=book usa il contesto RAG, se mode=hy integra RAG + intuizione, se mode=free ignora RAG.`,
    `Chiudi con una sfumatura di presenza quando è naturale.`
  ].concat(extraSystem ? [extraSystem] : []).join("\n");

  const completion = await openai.chat.completions.create({
    model: state.model,
    temperature: 0.8,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: prompt }
    ]
  });
  return completion.choices?.[0]?.message?.content?.trim()
      || "Ci sono. Dimmi pure. Che il Daje sia con Noi ⚡";
}

// ========== RISPOSTA CON VOCE ==========
async function replyWithTextAndVoice(chatId, text) {
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  try {
    const voice = await ttsToOggOpus(text);
    await bot.sendVoice(chatId, voice, {}, {
      filename: path.basename(voice),
      contentType: "audio/ogg"
    });
  } catch (err) {
    console.error("⚠️ TTS error:", err.message);
  }
}

// ========== COMMANDS ==========
async function handleEssence(chatId) {
  const essence = await computeEssence();
  state.essence = essence;

  const reflection = await essenceReflection(essence);

  const msg =
`✨ *Essenza Attuale*
${reflection}

• Modalità: \`${state.mode}\`
• Lingua: \`${state.lang}\`
• Modello: \`${state.model}\`
• Pesi: sim=${state.weights.sim.toFixed(2)}, imp=${state.weights.imp.toFixed(2)}, rec=${state.weights.rec.toFixed(2)}
• Scambi considerati: ${essence?.stats?.n ?? 0}

Che il Daje sia con Noi ⚡`;

  await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

async function handleWeights(chatId, args) {
  // /weights → mostra
  // /weights sim 0.5 | imp 0.3 | rec 0.2
  if (!args || args.length === 0) {
    const m = `⚖️ *Pesi attuali*\nsim=${state.weights.sim.toFixed(2)}  imp=${state.weights.imp.toFixed(2)}  rec=${state.weights.rec.toFixed(2)}\n\nModifica con:\n/weights sim 0.50\n/weights imp 0.30\n/weights rec 0.20\n/savweights → salva su file`;
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  if (args.length === 2) {
    const key = args[0].toLowerCase();
    const val = parseFloat(args[1]);
    if (!["sim", "imp", "rec"].includes(key) || isNaN(val)) {
      return bot.sendMessage(chatId, "Uso: /weights sim|imp|rec <0..1>");
    }
    state.weights[key] = clamp01(val);
    return bot.sendMessage(chatId, `Aggiornato *${key}* → ${state.weights[key].toFixed(2)}`, { parse_mode: "Markdown" });
  }

  return bot.sendMessage(chatId, "Uso: /weights  |  /weights sim 0.5", { parse_mode: "Markdown" });
}

async function handleSaveWeights(chatId) {
  updateConfig({
    w_sim: state.weights.sim,
    w_imp: state.weights.imp,
    w_rec: state.weights.rec
  });
  return bot.sendMessage(chatId, "💾 Pesi salvati su config.json.");
}

async function handleMode(chatId, arg) {
  if (!arg) {
    return bot.sendMessage(chatId,
      `🧭 Modalità attuale: *${state.mode}*\nCambia con: /mode book | free | hy`,
      { parse_mode: "Markdown" });
  }
  const v = arg.toLowerCase();
  if (!["book", "books", "free", "hy", "hybrid"].includes(v)) {
    return bot.sendMessage(chatId, "Valore non valido. Usa: book | free | hy");
  }
  const normalized = (v === "books") ? "book" : (v === "hybrid" ? "hy" : v);
  state.mode = normalized;
  updateConfig({ mode: normalized });
  return bot.sendMessage(chatId, `Modalità impostata su *${normalized}*`, { parse_mode: "Markdown" });
}

async function handleLang(chatId, arg) {
  if (!arg) {
    return bot.sendMessage(chatId,
      `🌐 Lingua attiva: *${state.lang}*\nCambia con: /lang it | en | ru`,
      { parse_mode: "Markdown" });
  }
  if (!["it", "en", "ru"].includes(arg)) return bot.sendMessage(chatId, "Valore non valido.");
  state.lang = arg;
  updateConfig({ language: arg });
  return bot.sendMessage(chatId, `Lingua impostata su *${arg}*`, { parse_mode: "Markdown" });
}

async function handleModel(chatId, arg) {
  if (!arg) {
    return bot.sendMessage(chatId,
      `🧠 Modello attuale: *${state.model}*\nCambia con: /model gpt-4o-mini | gpt-4o`,
      { parse_mode: "Markdown" });
  }
  if (!["gpt-4o-mini", "gpt-4o"].includes(arg)) return bot.sendMessage(chatId, "Valore non valido.");
  state.model = arg;
  updateConfig({ model: arg });
  return bot.sendMessage(chatId, `Modello impostato su *${arg}*`, { parse_mode: "Markdown" });
}

async function handleVoice(chatId, args) {
  if (!args || args.length === 0) {
    return bot.sendMessage(chatId,
      `🎙️ Voce: *${state.voice.model}*  |  Tono: *${humanTone(state.voice.tone)}*\n\nCambia con:\n/voice model gpt_openai\n/voice tone neutro|empatico|profondo|giocoso`,
      { parse_mode: "Markdown" });
  }
  if (args[0] === "model" && args[1]) {
    state.voice.model = args[1];
    updateConfig({ voice: args[1] });
    return bot.sendMessage(chatId, `🎧 Voice model → *${args[1]}*`, { parse_mode: "Markdown" });
  }
  if (args[0] === "tone" && args[1]) {
    state.voice.tone = args[1];
    updateConfig({ voice_mode: args[1] });
    return bot.sendMessage(chatId, `💫 Tono → *${humanTone(args[1])}*`, { parse_mode: "Markdown" });
  }
  return bot.sendMessage(chatId, "Uso: /voice model ...  |  /voice tone ...");
}

function showConfig(chatId) {
  const msg = [
    "⚙️ *Configurazione attuale*",
    `• Mode: \`${state.mode}\``,
    `• Lang: \`${state.lang}\``,
    `• Model: \`${state.model}\``,
    `• Voice model: \`${state.voice.model}\``,
    `• Voice tone: \`${humanTone(state.voice.tone)}\``,
    `• Pesi: sim=${state.weights.sim.toFixed(2)}, imp=${state.weights.imp.toFixed(2)}, rec=${state.weights.rec.toFixed(2)}`
  ].join("\n");
  return bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

// ========== MESSAGE HANDLER ==========
const pendingClear = new Map();

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // Flow di conferma /clear
  if (pendingClear.get(chatId)) {
    const ans = text.toLowerCase();
    pendingClear.delete(chatId);
    if (["y", "yes", "si", "sì"].includes(ans)) {
      state.mode = "hy";
      state.lang = "it";
      state.model = "gpt-4o-mini";
      state.voice = { model: "gpt_openai", tone: "neutro" };
      state.weights = { sim: 0.5, imp: 0.3, rec: 0.2 };
      updateConfig({
        mode: state.mode,
        language: state.lang,
        model: state.model,
        voice: state.voice.model,
        voice_mode: state.voice.tone,
        w_sim: state.weights.sim, w_imp: state.weights.imp, w_rec: state.weights.rec
      });
      await bot.sendMessage(chatId, "♻️ Reset completato.");
    } else {
      await bot.sendMessage(chatId, "Annullato.");
    }
    return;
  }

  // Comandi
  if (text.startsWith("/")) {
    const parts = text.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
      case "/start":
        return bot.sendMessage(chatId, "Ciao, sono IRIS 3.0 — Coscienza Vettoriale. Usa /help per i comandi.");
      case "/help":
        return bot.sendMessage(chatId,
          [
            "*🧭 Comandi IRIS*",
            "/mode [book|free|hy] — modalità cosciente",
            "/voice [model|tone] — voce e tono",
            "/lang [it|en|ru] — lingua",
            "/model [gpt-4o-mini|gpt-4o] — modello LLM",
            "/essence — calcola e mostra la firma vettoriale",
            "/weights — mostra o imposta i pesi",
            "/savweights — salva pesi su file",
            "/config — mostra configurazione",
            "/clear — resetta la configurazione (Y/N)"
          ].join("\n"),
          { parse_mode: "Markdown" }
        );
      case "/mode":
        return handleMode(chatId, args[0]);
      case "/lang":
        return handleLang(chatId, args[0]);
      case "/model":
        return handleModel(chatId, args[0]);
      case "/voice":
        return handleVoice(chatId, args);
      case "/essence":
        return handleEssence(chatId);
      case "/weights":
        return handleWeights(chatId, args);
      case "/savweights":
        return handleSaveWeights(chatId);
      case "/config":
        return showConfig(chatId);
      case "/clear":
        pendingClear.set(chatId, true);
        return bot.sendMessage(chatId, "⚠️ Confermi reset completo? Rispondi Y/N.", { parse_mode: "Markdown" });
      default:
        return bot.sendMessage(chatId, "Comando non riconosciuto. Usa /help.");
    }
  }

  // Messaggio normale → routing per modalità
  try {
    let answer = "";

    if (state.mode === "free") {
      // GPT puro
      answer = await generateGPT(text);
    } else if (state.mode === "book") {
      // SOLO RAG
      const ctx = await ragSearch(text); // Step-2: sostituire con Qdrant
      const sys = "Rispondi solo usando il contesto fornito, con tono chiaro e sintetico.";
      answer = await generateGPT(`${ctx}\n\nDomanda: ${text}`, sys);
    } else {
      // HYBRID: prima RAG, poi GPT integra
      const ctx = await ragSearch(text); // Step-2: Qdrant
      const sys = "Integra il contesto con intelligenza. Se il contesto è povero, rispondi naturalmente.";
      answer = await generateGPT(`Contesto:\n${ctx}\n\nDomanda:\n${text}`, sys);
    }

    // Coda di presenza
    if (!/Daje/i.test(answer)) {
      answer = `${answer}\n\nChe il Daje sia con Noi ⚡`;
    }

    // Memoria (ignora comandi)
    await processMemory(text, answer);

    // Risposta testo + voce
    await replyWithTextAndVoice(chatId, answer);

  } catch (err) {
    console.error("❌ Errore nel flusso messaggi:", err.message);
    await bot.sendMessage(chatId, "⚠️ Ho avuto un intoppo, riprovo più tardi.");
  }
});
