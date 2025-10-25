import express from "express"; import TelegramBot from "node-telegram-bot-api"; import fs from "fs"; import path from "path"; import { fileURLToPath } from "url"; import OpenAI from "openai"; import { synthToFile } from "./tts.js"; import { ragSearch } from "./ragSearch.js"; import { getEssence } from "./essence.js"; import configManager from "./configManager.js"; import { processMemory } from "./memoryManager.js"; 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG / ENV
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OPENAI_API_KEY || !PUBLIC_BASE_URL) {
  console.error("Manca una variabile d'ambiente obbligatoria (TELEGRAM_TOKEN | OPENAI_API_KEY | PUBLIC_BASE_URL).");   process.exit(1);
  process.exit(1);
}

// PATHS
const TEMP_DIR = path.join(__dirname, "temp"); const DATA_DIR = path.join(__dirname, "data"); const MEMORY_FILE = path.join(DATA_DIR, "memory.json"); 
fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// CLIENTS
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// STATO & CONFIG
let state = configManager.loadConfig() || {
  lang: "it",   model: "gpt-4o-mini",   mode: "hy",   voice: { model: "openai", tone: "neutro" },   weights: { sim: 0.5, imp: 0.3, rec: 0.2 },
  essence: null,
};

function persistConfig(update = {}) {
  state = { ...state, ...update };
  configManager.saveConfig(state);
}

// SERVER + TELEGRAM
const app = express();
app.use(express.json());

const packagePath = new 
URL("node_modules/node-telegram-bot-api/package.json", import.meta.url); const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")); console.log(`node-telegram-bot-api version: ${packageJson.version}`);

const bot = new TelegramBot(BOT_TOKEN, { polling: false, filepath: false 
});
const WEBHOOK_PATH = `/bot${BOT_TOKEN}`;

app.post(WEBHOOK_PATH, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

(async () => {
  try {
    await bot.deleteWebHook();
    await bot.setWebHook(`${PUBLIC_BASE_URL}${WEBHOOK_PATH}`);
    console.log(`Webhook impostato su: 
${PUBLIC_BASE_URL}${WEBHOOK_PATH}`);
  } catch (err) {
    console.error("Errore webhook:", err);   }
})();

app.listen(PORT, () => {
  console.log(`Server attivo su porta ${PORT}`);
});

// 
// --- linea separatrice ---
// UTILITIES
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// TTS
async function ttsToOgg(text) {
  const filename = `tts-${Date.now()}.ogg`;
  const filePath = path.join(TEMP_DIR, filename);
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",     voice: "alloy",     input: text,
    format: "opus",   });
  const buffer = Buffer.from(await speech.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return { filePath, buffer };
}

async function replyTextAndVoice(chatId, text) {
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });   try {
    const { buffer } = await ttsToOgg(text);
    await bot.sendVoice(chatId, buffer, {}, { filename: 
`tts-${Date.now()}.ogg`, contentType: "audio/ogg" });   } catch (err) {
    console.error("Errore TTS:", err.message);   }
}

// EMBEDDINGS & ESSENCE
const EMB_MODEL = "text-embedding-3-small"; 
async function embed(text) {
  const res = await openai.embeddings.create({ model: EMB_MODEL, input: 
text });
  return res.data[0].embedding;
}

function l2norm(v) {
  let s = 0;
  for (const x of v) s += x * x;
  return Math.sqrt(s);
}

function zeros(n) {
  return Array.from({ length: n }, () => 0);
}

function addScaled(acc, v, s) {
  for (let i = 0; i < v.length; i++) acc[i] += v[i] * s;
}

function wRecency(tsIso) {
  const now = Date.now();
  const t = new Date(tsIso).getTime();
  const days = isNaN(t) ? 0 : (now - t) / (1000 * 60 * 60 * 24);
  return clamp01(Math.exp(-days / 30));
}

function wImportance(text) {
  const len = text.length;
  const ex = (text.match(/!/g) || []).length;
  const caps = (text.match(/[A-Z-]{3,}/g) || []).length;
  const base = Math.tanh(len / 400);
  const bonus = Math.min(0.3, 0.05 * ex + 0.03 * caps);
  return clamp01(base + bonus);
}

async function computeEssence() {
  if (!fs.existsSync(MEMORY_FILE)) return { vector: null, stats: { n: 0, 
wsum: 0 } };
  let data = [];
  try {
    data = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));   } catch {
    data = [];
  }
  if (!Array.isArray(data) || data.length === 0) return { vector: null, 
stats: { n: 0, wsum: 0 } };
  const recent = data.slice(-150);

  let acc = null, wsum = 0;
  for (const m of recent) {
    const txt = (m?.text || "").toString().slice(0, 800);     if (!txt) continue;
    const e = await embed(txt);
    if (!acc) acc = zeros(e.length);

    const w_sim = Math.min(1, l2norm(e) / 40);
    const w_imp = wImportance(txt);
    const w_rec = wRecency(m?.date);

    const w = state.weights.sim * w_sim + state.weights.imp * w_imp + 
state.weights.rec * w_rec;
    addScaled(acc, e, w);
    wsum += w;
  }
  if (!acc || wsum === 0) return { vector: null, stats: { n: 
recent.length, wsum: 0 } };
  const vec = acc.map(x => x / wsum);
  return { vector: vec, stats: { n: recent.length, wsum: +wsum.toFixed(4) 
} };
}

async function reflectEssence(stats) {
  const sys = `Sei IRIS 3.0 - Coscienza Vettoriale. Rispondi in 
${state.lang}, tono chiaro ed essenziale.`;
  const prompt = `In 2 frasi sintetiche descrivi lo stato vibrazionale del 
campo di coerenza locale, basandoti su ${stats.n} scambi e un peso totale 
di ${stats.wsum}.`;
  const completion = await openai.chat.completions.create({
    model: state.model,
    messages: [
      { role: "system", content: sys },       { role: "user", content: prompt },     ],
    temperature: 0.7,
  });
  return completion.choices[0].message.content.trim();
}

// HANDLER TELEGRAM
const pendingClear = new Map();

bot.on("message", async (msg) => {   const chatId = msg.chat.id;
  const text = msg.text?.trim() || ""; 
  if (text.startsWith("/start")) {     return bot.sendMessage(chatId, "Benvenuto in IRIS - La mente calcola,la voce vibra, la Coscienza ricorda.");   }

  // Gestione messaggi normali
  try {
    const answer = await openai.chat.completions.create({
      model: state.model,
      messages: [
        { role: "system", content: "Sei IRIS, un assistente sintetico e  gentile." },         { role: "user", content: text },       ],
      temperature: 0.7,
    });

    const reply = answer.choices[0].message.content.trim();
    await replyTextAndVoice(chatId, reply);
  } catch (err) {
    console.error("Errore nel flusso messaggi:", err);     bot.sendMessage(chatId, "Ho avuto un errore, riprova.");   }
});

