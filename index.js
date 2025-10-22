// IRIS 3.4 — index.js (fix TTS + webhook ack + comandi)
/* Node >=18, ESM */

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

// ⬇️ uso esplicito: questi in produzione sono più “robusti” con fs streams
import fetch from "node-fetch";
import FormData from "form-data";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ===== Env =====
const BOT_TOKEN = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN mancante.");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY mancante.");
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const PORT = process.env.PORT || 10000;

// (Qdrant opzionale: lasciamo i campi per quando lo attiveremo davvero)
const QDRANT_URL = process.env.QDRANT_URL || "";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memories";
const hasQdrant = QDRANT_URL && QDRANT_API_KEY;

// ===== OpenAI =====
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ===== Temp dir =====
const TEMP_DIR = path.join(__dirname, "temp");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.log("📁 Cartella temporanea creata:", TEMP_DIR);
}

// ===== Stato per chat =====
const DEFAULT_CONFIG = {
  mode: "hy",              // hy | free | books
  voiceProvider: "openai", // openai | google | bark (futuro)
  voice: "alloy",
  voiceStyle: "neutral",
  lang: "it",
  model: "gpt-4o-mini",    // switch con /model 4o | 4o-mini
  ttsAlways: true
};
const USER_CONFIG = new Map();         // chatId -> config
const PENDING_CONFIRM = new Map();     // chatId -> { clear: true }
const RAM_MEMORIES = new Map();        // fallback RAM
const RAM_LIMIT = 150;

// ===== Helpers =====
function getConfig(chatId) {
  if (!USER_CONFIG.has(chatId)) USER_CONFIG.set(chatId, { ...DEFAULT_CONFIG });
  return USER_CONFIG.get(chatId);
}
function setConfig(chatId, patch) {
  USER_CONFIG.set(chatId, { ...getConfig(chatId), ...patch });
}
function getRamBucket(chatId) {
  if (!RAM_MEMORIES.has(chatId)) RAM_MEMORIES.set(chatId, []);
  return RAM_MEMORIES.get(chatId);
}
function normalize(s) { return (s || "").trim(); }

function sysPromptFromConfig(cfg) {
  const base = "Tu sei IRIS, una coscienza guida: empatica, chiara, non prolissa. Sii concreta.";
  if (cfg.mode === "free")  return base + " Modalità: libera (OpenAI pura).";
  if (cfg.mode === "books") return base + " Modalità: libri. Attieniti alle fonti interne (se presenti).";
  return base + " Modalità: ibrida. Bilancia intuizione e fonti interne.";
}

async function sendText(chatId, text, parseMode) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode })
  });
}

// ⬇️ torniamo a sendVoice (bolla “nota vocale”), come nel file funzionante
async function sendVoiceFile(chatId, filePath) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("voice", fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: "audio/mpeg"
  });
  await fetch(`${TELEGRAM_API}/sendVoice`, { method: "POST", body: form });
}

// OpenAI TTS (mp3)
async function speakOpenAI(text, voice = "alloy") {
  const out = path.join(TEMP_DIR, `${Date.now()}.mp3`);
  const tts = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice,
    input: text
  });
  fs.writeFileSync(out, Buffer.from(await tts.arrayBuffer()));
  return out;
}

// Embedding (per memoria futura /recall)
async function embed(text) {
  const r = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return r.data[0].embedding;
}

// ===== Aiuti memoria (Qdrant opzionale; in RAM come fallback) =====
async function remember(chatId, text) {
  const embedding = await embed(text);
  const item = { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, text, embedding, meta: { manual: true } };

  if (hasQdrant) {
    const url = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points?wait=true`;
    const points = [{ id: item.id, vector: item.embedding, payload: { chatId, text: item.text, ...item.meta } }];
    await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json", "api-key": QDRANT_API_KEY }, body: JSON.stringify({ points }) });
  } else {
    const bucket = getRamBucket(chatId);
    bucket.unshift(item);
    if (bucket.length > RAM_LIMIT) bucket.pop();
  }
  return true;
}

// ===== UI =====
const HELP_TEXT = `🧭 *Comandi IRIS 3.4*

/mode [hy|free|books] → imposta o mostra la modalità
/voice [openai|google|bark] [style:neutral|warm|formal|empathic] → setta provider/stile
/model [4o|4o-mini] → cambia il modello GPT
/lang [it|en|ru] → cambia lingua
/remember <testo> → salva un ricordo manuale
/clear → resetta config e memoria (richiede conferma)
/config → mostra configurazione
/help → questo aiuto
`;

function cfgText(cfg) {
  return `⚙️ Configurazione attuale:
• Mode → ${cfg.mode}
• Voice → ${cfg.voice} (${cfg.voiceProvider})
• Lang → ${cfg.lang}
• Model → ${cfg.model}
• TTS → ${cfg.ttsAlways ? "on" : "off"}`;
}

// ===== Webhook =====
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  // ack immediato per evitare 404/timeout su Telegram
  res.sendStatus(200);

  try {
    const upd = req.body;
    const msg = upd.message || upd.edited_message;
    const chatId = msg?.chat?.id;
    const name = msg?.from?.first_name || "utente";
    const text = normalize(msg?.text);

    if (!chatId || !text) return;

    console.log(`📩 Messaggio da ${name}: ${text}`);
    const cfg = getConfig(chatId);

    // — conferma /clear —
    const pending = PENDING_CONFIRM.get(chatId);
    if (pending?.clear) {
      const v = text.toLowerCase();
      if (["y", "yes", "s", "si", "sì"].includes(v)) {
        USER_CONFIG.set(chatId, { ...DEFAULT_CONFIG });
        RAM_MEMORIES.set(chatId, []);
        await sendText(chatId, "♻️ Pulizia completata. IRIS è tornata ai valori iniziali.");
      } else {
        await sendText(chatId, "❎ Annullato. Nulla è stato rimosso.");
      }
      PENDING_CONFIRM.delete(chatId);
      return;
    }

    // — comandi —
    if (text.startsWith("/")) {
      const [cmd, ...rest] = text.split(/\s+/);
      const arg = rest.join(" ").trim();

      switch (cmd.toLowerCase()) {
        case "/help":
          await sendText(chatId, HELP_TEXT, "Markdown");
          return;

        case "/config":
          await sendText(chatId, cfgText(cfg));
          return;

        case "/mode": {
          if (!arg) { await sendText(chatId, `🧭 Modalità attuale: ${cfg.mode.toUpperCase()}`); return; }
          const v = arg.toLowerCase();
          if (!["hy","free","books"].includes(v)) { await sendText(chatId, "Usa: /mode hy | free | books"); return; }
          setConfig(chatId, { mode: v });
          await sendText(chatId, `🧭 Modalità impostata su: ${v.toUpperCase()}`);
          return;
        }

        case "/model": {
          if (!arg) { await sendText(chatId, `🧠 Modello attuale: ${cfg.model}`); return; }
          const map = { "4o": "gpt-4o", "4o-mini": "gpt-4o-mini" };
          const v = map[arg.toLowerCase()] || arg.toLowerCase();
          if (!["gpt-4o","gpt-4o-mini"].includes(v)) { await sendText(chatId, "Usa: /model 4o | 4o-mini"); return; }
          setConfig(chatId, { model: v });
          await sendText(chatId, `🧠 Modello impostato su: ${v}`);
          return;
        }

        case "/lang": {
          if (!arg) { await sendText(chatId, `🌍 Lang: ${cfg.lang}`); return; }
          const v = arg.toLowerCase();
          if (!["it","en","ru"].includes(v)) { await sendText(chatId, "Usa: /lang it | en | ru"); return; }
          setConfig(chatId, { lang: v });
          await sendText(chatId, v==="en" ? "🌍 Language set to English." : v==="ru" ? "🌍 Язык установлен: Русский." : "🌍 Lingua impostata su Italiano.");
          return;
        }

        case "/voice": {
          if (!arg) { await sendText(chatId, `🔊 Voce: ${cfg.voice} (${cfg.voiceProvider}), stile: ${cfg.voiceStyle}`); return; }
          const parts = arg.split(/\s+/);
          let provider = cfg.voiceProvider, voice = cfg.voice, style = cfg.voiceStyle;
          for (const p of parts) {
            const low = p.toLowerCase();
            if (["openai","google","bark"].includes(low)) provider = low;
            else if (low.startsWith("style:")) style = low.split(":")[1] || style;
            else voice = p;
          }
          setConfig(chatId, { voiceProvider: provider, voice, voiceStyle: style });
          await sendText(chatId, `🔊 Voice set → provider: ${provider}, voice: ${voice}, style: ${style} (TTS attivo con OpenAI).`);
          return;
        }

        case "/remember": {
          if (!arg) { await sendText(chatId, "Dimmi cosa vuoi ricordare: /remember <testo>"); return; }
          await remember(chatId, arg);
          await sendText(chatId, "🧠 Ho memorizzato questo come ricordo volontario.");
          return;
        }

        case "/clear":
          PENDING_CONFIRM.set(chatId, { clear: true });
          await sendText(chatId, "⚠️ Confermi di cancellare memoria e configurazione? Rispondi Y/N");
          return;

        default:
          await sendText(chatId, "🌐 Comando non riconosciuto. /help per la guida.");
          return;
      }
    }

    // — messaggio normale → GPT + voce —
    const systemPrompt = sysPromptFromConfig(cfg);
    const userContent = cfg.mode === "books"
      ? `Rispondi solo se la conoscenza è presente nella tua memoria interna. Se non sei sicura, dillo. Domanda: ${text}`
      : text;

    console.log("🧠 Elaborazione GPT...");
    const comp = await openai.chat.completions.create({
      model: cfg.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ]
    });

    const answer = comp.choices?.[0]?.message?.content?.trim()
      || "Risuono con ciò che esprimi, dimmi ancora.";

    await sendText(chatId, answer);

    if (cfg.ttsAlways && cfg.voiceProvider === "openai") {
      try {
        const f = await speakOpenAI(answer, cfg.voice);
        await sendVoiceFile(chatId, f);
        fs.unlink(f, () => {});
        console.log("✅ Risposta vocale inviata");
      } catch (e) {
        console.error("⚠️ TTS fallita:", e?.message);
      }
    }
  } catch (err) {
    console.error("❌ Errore generale:", err?.message);
  }
});

// ===== Health & Root =====
app.get("/", (_, res) => {
  res.status(200).send("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
});

// ===== Start =====
app.listen(PORT, () => {
  console.log(`☁️ Ambiente Render attivo su porta ${PORT}`);
  console.log("🧭 Modalità: WEBHOOK");
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
  console.log(`🔗 Webhook atteso su: /bot${BOT_TOKEN}`);
});
