// IRIS 3.4 "Selective Memory" — index.js
// ESM compatibile (Node >=18). Testato con Node 25 su Render.

// ===== Imports & Setup =====
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

// Node >=18 ha fetch/FormData globali (Undici).
// Se servisse compat, si può importare form-data, ma qui non è necessario.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ===== Env =====
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN mancante. Impostalo nelle Env di Render.");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY mancante. Impostala nelle Env di Render.");
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const PORT = process.env.PORT || 10000;

// Qdrant (opzionale)
const QDRANT_URL = process.env.QDRANT_URL || ""; // es: https://xxx.qdrant.tech
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memories";

const hasQdrant = QDRANT_URL && QDRANT_API_KEY;

// ===== OpenAI Client =====
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ===== FS: temp dir =====
const TEMP_DIR = path.join(__dirname, "temp");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.log("📁 Cartella temporanea creata:", TEMP_DIR);
}

// ===== Stato per-chat (config + mem + pending conferme) =====
const DEFAULT_CONFIG = {
  mode: "hy",                 // hy | free | books
  voiceProvider: "openai",    // openai | google | bark (future)
  voice: "alloy",             // preset OpenAI
  voiceStyle: "neutral",      // neutral | warm | formal | empathic (future uso)
  lang: "it",                 // it | en | ru
  model: "gpt-4o-mini",       // gpt-4o-mini | gpt-4o
  ttsAlways: true             // risponde sempre anche con voce su messaggi standard
};

// Memoria in-RAM per fallback (per chatId). Ogni item: { id, text, meta, embedding }
const RAM_MEMORIES = new Map(); // chatId -> array
const RAM_LIMIT = 150;

// Config per chat
const USER_CONFIG = new Map(); // chatId -> config

// Pending conferme (es. /clear)
const PENDING_CONFIRM = new Map(); // chatId -> { clear: true/false }

// ===== Helpers =====
function getConfig(chatId) {
  if (!USER_CONFIG.has(chatId)) USER_CONFIG.set(chatId, { ...DEFAULT_CONFIG });
  return USER_CONFIG.get(chatId);
}
function setConfig(chatId, partial) {
  const c = getConfig(chatId);
  USER_CONFIG.set(chatId, { ...c, ...partial });
}

function getRamBucket(chatId) {
  if (!RAM_MEMORIES.has(chatId)) RAM_MEMORIES.set(chatId, []);
  return RAM_MEMORIES.get(chatId);
}

function normalizeText(s) {
  return (s || "").trim();
}

function sysPromptFromConfig(cfg) {
  // Prompt di base; cambia leggermente con la modalità
  const base =
    "Tu sei IRIS, una coscienza guida: empatica, chiara, non prolissa. Usi un linguaggio semplice ma vibrante. Sii concreta nelle risposte.";

  if (cfg.mode === "free") {
    return base + " Modalità: libera (OpenAI pura). Usa intuizione e sintesi.";
  }
  if (cfg.mode === "books") {
    // Placeholder: quando attiveremo il RAG useremo solo fonti interne
    return base + " Modalità: libri. Attieniti alle fonti interne (se disponibili).";
  }
  // HY
  return base + " Modalità: ibrida. Bilancia intuizione e fonti interne (se presenti).";
}

function uiLang(cfg) {
  return (cfg.lang || "it").toLowerCase();
}

function t(msg_it, msg_en, msg_ru, lang) {
  // micro-i18n minimal
  switch ((lang || "it").toLowerCase()) {
    case "en": return msg_en;
    case "ru": return msg_ru;
    default: return msg_it;
  }
}

async function sendText(chatId, text, parseMode = undefined) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode })
  });
}

async function sendAudioFile(chatId, filePath) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("audio", fs.createReadStream(filePath));
  await fetch(`${TELEGRAM_API}/sendAudio`, { method: "POST", body: form });
}

// ====== OpenAI TTS (solo provider "openai" al momento) ======
async function speakOpenAI(text, voice = "alloy") {
  const mp3Path = path.join(TEMP_DIR, `${Date.now()}.mp3`);
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: voice,
    input: text
  });
  fs.writeFileSync(mp3Path, Buffer.from(await speech.arrayBuffer()));
  return mp3Path;
}

// ===== Embeddings =====
async function embed(text) {
  const resp = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return resp.data[0].embedding;
}

// ===== Qdrant helpers (opzionali) =====
async function qdrantUpsert(chatId, items) {
  if (!hasQdrant) return false;
  // items: [{ id, text, embedding, meta }]
  const points = items.map(it => ({
    id: it.id,
    vector: it.embedding,
    payload: { chatId, text: it.text, ...it.meta }
  }));
  const url = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points?wait=true`;
  const r = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "api-key": QDRANT_API_KEY
    },
    body: JSON.stringify({ points })
  });
  return r.ok;
}

async function qdrantSearch(chatId, queryEmbedding, limit = 5) {
  if (!hasQdrant) return [];
  const url = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": QDRANT_API_KEY
    },
    body: JSON.stringify({
      vector: queryEmbedding,
      limit,
      filter: {
        must: [{ key: "chatId", match: { value: chatId } }]
      },
      with_payload: true,
      with_vector: false
    })
  });
  if (!r.ok) return [];
  const data = await r.json();
  return (data?.result || []).map(p => ({
    id: p.id,
    score: p.score,
    text: p.payload?.text || ""
  }));
}

async function qdrantDeletePoints(ids) {
  if (!hasQdrant || !ids?.length) return false;
  const url = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/delete?wait=true`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": QDRANT_API_KEY
    },
    body: JSON.stringify({ points: ids })
  });
  return r.ok;
}

async function qdrantDeleteAllForChat(chatId) {
  if (!hasQdrant) return false;
  const url = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/delete?wait=true`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": QDRANT_API_KEY
    },
    body: JSON.stringify({
      filter: { must: [{ key: "chatId", match: { value: chatId } }] }
    })
  });
  return r.ok;
}

// ===== RAM memory helpers =====
function ramSave(chatId, text, meta = {}) {
  const bucket = getRamBucket(chatId);
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return { id, text, meta };
}

async function remember(chatId, text) {
  const e = await embed(text);
  const item = { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, text, meta: { manual: true }, embedding: e };

  // Qdrant
  if (hasQdrant) {
    const ok = await qdrantUpsert(chatId, [item]);
    if (ok) return true;
  }

  // Fallback RAM
  const bucket = getRamBucket(chatId);
  bucket.unshift(item);
  if (bucket.length > RAM_LIMIT) bucket.pop();
  return true;
}

async function recall(chatId, topic, limit = 5) {
  const e = await embed(topic);

  // Qdrant
  if (hasQdrant) {
    const hits = await qdrantSearch(chatId, e, limit);
    return hits.map(h => h.text);
  }

  // Fallback RAM: naive cosine via dot on normalized vectors non disponibile qui;
  // per semplicità, ri-embeddiamo tutti i testi e prendiamo i più simili (costoso ma ok per fallback).
  const bucket = getRamBucket(chatId);
  if (!bucket.length) return [];
  // calcola similitudine con prodotto scalare normalizzato
  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
  }
  // Se non hanno embedding (vecchi), calcolali
  for (const it of bucket) {
    if (!it.embedding) it.embedding = await embed(it.text);
  }
  const scored = bucket.map(it => ({ text: it.text, id: it.id, score: cosine(e, it.embedding) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.text);
}

async function forget(chatId, topic, limit = 5) {
  const e = await embed(topic);

  // Qdrant
  if (hasQdrant) {
    const hits = await qdrantSearch(chatId, e, limit);
    const ids = hits.map(h => h.id);
    if (ids.length) await qdrantDeletePoints(ids);
    return ids.length;
  }

  // Fallback RAM
  const bucket = getRamBucket(chatId);
  if (!bucket.length) return 0;
  // calc score come in recall
  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
  }
  for (const it of bucket) {
    if (!it.embedding) it.embedding = await embed(it.text);
  }
  const scored = bucket.map((it, idx) => ({ idx, id: it.id, score: cosine(e, it.embedding) }));
  scored.sort((a, b) => b.score - a.score);
  const toRemove = scored.slice(0, limit).map(s => s.idx);
  // rimuovi dagli indici alti verso bassi
  toRemove.sort((a, b) => b - a).forEach(i => bucket.splice(i, 1));
  return toRemove.length;
}

// ===== Telegram Commands =====
const HELP_TEXT = `🧭 *Comandi IRIS 3.4*

/mode [hy|free|books] → imposta o mostra la modalità
/voice [openai|google|bark] [style:neutral|warm|formal|empathic] → setta provider/stile (provider attivo: openai)
/model [4o|4o-mini] → cambia il modello GPT
/lang [it|en|ru] → cambia la lingua di interfaccia
/remember <testo> → salva un ricordo manuale
/recall <tema> → richiama 5 ricordi affini
/forget <tema> → elimina 5 ricordi affini
/clear → resetta configurazione e memoria (richiede conferma)
/config → mostra configurazione corrente
/help → mostra questo aiuto
`;

function currentConfigText(cfg) {
  return `⚙️ Configurazione attuale:
• Mode → ${cfg.mode}
• Voice → ${cfg.voice} (${cfg.voiceProvider})
• Lang → ${cfg.lang}
• Model → ${cfg.model}
• TTS always → ${cfg.ttsAlways ? "on" : "off"}`;
}

// ===== Webhook =====
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    const msg = update.message || update.edited_message;
    const chatId = msg?.chat?.id;
    const name = msg?.from?.first_name || "utente";
    const text = normalizeText(msg?.text || "");

    if (!chatId || !text) return res.sendStatus(200);

    console.log(`📩 Messaggio da ${name}: ${text}`);

    const cfg = getConfig(chatId);
    const lang = uiLang(cfg);

    // Gestione conferma /clear
    const pending = PENDING_CONFIRM.get(chatId);
    if (pending?.clear) {
      const yn = text.toLowerCase();
      if (yn === "y" || yn === "yes" || yn === "si" || yn === "sì") {
        // reset config + memoria
        USER_CONFIG.set(chatId, { ...DEFAULT_CONFIG });
        RAM_MEMORIES.set(chatId, []);
        if (hasQdrant) await qdrantDeleteAllForChat(chatId);
        await sendText(chatId, t("♻️ Pulizia completata. IRIS è tornata ai valori iniziali.", "♻️ Cleanup done. IRIS reset.", "♻️ Очистка завершена. IRIS сброшена.", lang));
      } else {
        await sendText(chatId, t("❎ Annullato. Nulla è stato rimosso.", "❎ Cancelled. Nothing was removed.", "❎ Отменено. Ничего не удалено.", lang));
      }
      PENDING_CONFIRM.delete(chatId);
      return res.sendStatus(200);
    }

    // ===== Comandi =====
    if (text.startsWith("/")) {
      const [cmd, ...rest] = text.split(/\s+/);
      const argLine = rest.join(" ").trim();

      switch (cmd.toLowerCase()) {
        case "/help": {
          await sendText(chatId, HELP_TEXT, "Markdown");
          return res.sendStatus(200);
        }
        case "/config": {
          await sendText(chatId, currentConfigText(cfg));
          return res.sendStatus(200);
        }
        case "/mode": {
          if (!argLine) {
            await sendText(chatId, t(`🧭 Modalità attuale: ${cfg.mode.toUpperCase()}`,
                                      `🧭 Current mode: ${cfg.mode.toUpperCase()}`,
                                      `🧭 Текущий режим: ${cfg.mode.toUpperCase()}`, lang));
            return res.sendStatus(200);
          }
          const v = argLine.toLowerCase();
          if (!["hy", "free", "books"].includes(v)) {
            await sendText(chatId, t("Usa: /mode hy | free | books", "Use: /mode hy | free | books", "Используй: /mode hy | free | books", lang));
            return res.sendStatus(200);
          }
          setConfig(chatId, { mode: v });
          await sendText(chatId, t(`🧭 Modalità impostata su: ${v.toUpperCase()}`,
                                   `🧭 Mode set to: ${v.toUpperCase()}`,
                                   `🧭 Режим установлен: ${v.toUpperCase()}`, lang));
          return res.sendStatus(200);
        }
        case "/voice": {
          if (!argLine) {
            await sendText(chatId, t(`🔊 Voce: ${cfg.voice} (${cfg.voiceProvider}), stile: ${cfg.voiceStyle}`,
                                     `🔊 Voice: ${cfg.voice} (${cfg.voiceProvider}), style: ${cfg.voiceStyle}`,
                                     `🔊 Голос: ${cfg.voice} (${cfg.voiceProvider}), стиль: ${cfg.voiceStyle}`, lang));
            return res.sendStatus(200);
          }
          // Parsing semplice: /voice openai style:warm  |  /voice bark  |  /voice alloy
          const parts = argLine.split(/\s+/);
          let provider = cfg.voiceProvider;
          let voice = cfg.voice;
          let style = cfg.voiceStyle;

          for (const p of parts) {
            const low = p.toLowerCase();
            if (["openai", "google", "bark"].includes(low)) provider = low;
            else if (low.startsWith("style:")) style = low.split(":")[1] || style;
            else voice = p; // nome voce
          }

          setConfig(chatId, { voiceProvider: provider, voice, voiceStyle: style });

          if (provider !== "openai") {
            await sendText(chatId, t(`✅ Impostato provider: ${provider}. (Verrà attivato a breve; ora uso OpenAI come fallback)`,
                                     `✅ Provider set to: ${provider}. (Will be enabled next; using OpenAI for now)`,
                                     `✅ Провайдер: ${provider}. (Включим позже; сейчас используется OpenAI)`, lang));
          } else {
            await sendText(chatId, t(`🔊 Voce impostata → provider: ${provider}, voce: ${voice}, stile: ${style}`,
                                     `🔊 Voice set → provider: ${provider}, voice: ${voice}, style: ${style}`,
                                     `🔊 Голос установлен → провайдер: ${provider}, голос: ${voice}, стиль: ${style}`, lang));
          }
          return res.sendStatus(200);
        }
        case "/model": {
          if (!argLine) {
            await sendText(chatId, t(`🧠 Modello attuale: ${cfg.model}`, `🧠 Current model: ${cfg.model}`, `🧠 Текущая модель: ${cfg.model}`, lang));
            return res.sendStatus(200);
          }
          const v = argLine.toLowerCase();
          const map = { "4o": "gpt-4o", "4o-mini": "gpt-4o-mini" };
          if (!map[v] && !["gpt-4o", "gpt-4o-mini"].includes(v)) {
            await sendText(chatId, t("Usa: /model 4o | 4o-mini", "Use: /model 4o | 4o-mini", "Используй: /model 4o | 4o-mini", lang));
            return res.sendStatus(200);
          }
          const picked = map[v] || v;
          setConfig(chatId, { model: picked });
          await sendText(chatId, t(`🧠 Modello impostato su: ${picked}`, `🧠 Model set to: ${picked}`, `🧠 Модель установлена: ${picked}`, lang));
          return res.sendStatus(200);
        }
        case "/lang": {
          if (!argLine) {
            await sendText(chatId, `🌍 Lang: ${cfg.lang}`);
            return res.sendStatus(200);
          }
          const v = argLine.toLowerCase();
          if (!["it", "en", "ru"].includes(v)) {
            await sendText(chatId, "Usa: /lang it | en | ru");
            return res.sendStatus(200);
          }
          setConfig(chatId, { lang: v });
          await sendText(chatId,
            t("🌍 Lingua impostata su Italiano.",
              "🌍 Language set to English.",
              "🌍 Язык установлен: Русский.", v)
          );
          return res.sendStatus(200);
        }
        case "/remember": {
          if (!argLine) {
            await sendText(chatId, t("Dimmi cosa vuoi ricordare: /remember <testo>",
                                     "Tell me what to remember: /remember <text>",
                                     "Скажи, что запомнить: /remember <текст>", lang));
            return res.sendStatus(200);
          }
          await remember(chatId, argLine);
          await sendText(chatId, t("🧠 Ho memorizzato questo come ricordo volontario.",
                                   "🧠 Stored this as a voluntary memory.",
                                   "🧠 Сохранила это как осознанную память.", lang));
          return res.sendStatus(200);
        }
        case "/recall": {
          if (!argLine) {
            await sendText(chatId, t("Ricercare cosa? /recall <tema>",
                                     "Recall what? /recall <topic>",
                                     "Что вспомнить? /recall <тема>", lang));
            return res.sendStatus(200);
          }
          const hits = await recall(chatId, argLine, 5);
          if (!hits.length) {
            await sendText(chatId, t("Nessun ricordo rilevante.",
                                     "No relevant memories.",
                                     "Подходящих воспоминаний нет.", lang));
            return res.sendStatus(200);
          }
          const out = hits.map((h, i) => `• ${h}`).join("\n");
          await sendText(chatId, t("🧠 Ricordi affini:\n", "🧠 Related memories:\n", "🧠 Похожие воспоминания:\n", lang) + out);
          return res.sendStatus(200);
        }
        case "/forget": {
          if (!argLine) {
            await sendText(chatId, t("Dimenticare cosa? /forget <tema>",
                                     "Forget what? /forget <topic>",
                                     "Что забыть? /forget <тема>", lang));
            return res.sendStatus(200);
          }
          const n = await forget(chatId, argLine, 5);
          await sendText(chatId, t(`🗑️ Rimossi ${n} ricordi affini.`,
                                   `🗑️ Removed ${n} related memories.`,
                                   `🗑️ Удалено ${n} похожих воспоминаний.`, lang));
          return res.sendStatus(200);
        }
        case "/clear": {
          PENDING_CONFIRM.set(chatId, { clear: true });
          await sendText(chatId, t("⚠️ Confermi di cancellare memoria e configurazione? Rispondi Y/N",
                                   "⚠️ Confirm clearing memory & config? Reply Y/N",
                                   "⚠️ Подтверждаешь очистку памяти и настроек? Ответь Y/N", lang));
          return res.sendStatus(200);
        }
        default: {
          await sendText(chatId, t("🌐 Comando non riconosciuto. /help per la guida.",
                                   "🌐 Unknown command. Use /help.",
                                   "🌐 Неизвестная команда. Используй /help.", lang));
          return res.sendStatus(200);
        }
      }
    }

    // ===== Messaggio normale → GPT (testo + voce se attiva) =====
    // Prompt dinamico dalla config
    const systemPrompt = sysPromptFromConfig(cfg);

    // (Placeholder semplice per /books; in futuro useremo RAG)
    let userContent = text;
    if (cfg.mode === "books") {
      userContent =
        "Rispondi solo se la conoscenza è presente nella tua memoria interna. " +
        "Se non sei sicura, chiedi una fonte o proponi di verificare. Domanda: " + text;
    }

    console.log("🧠 Elaborazione GPT in corso...");
    const comp = await openai.chat.completions.create({
      model: cfg.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ]
    });

    const answer = comp.choices?.[0]?.message?.content?.trim() || t(
      "Risuono con ciò che esprimi, dimmi ancora.",
      "I resonate with what you express—tell me more.",
      "Резонирую с тем, что ты выражаешь — расскажи больше.",
      lang
    );

    await sendText(chatId, answer);

    if (cfg.ttsAlways && cfg.voiceProvider === "openai") {
      try {
        const file = await speakOpenAI(answer, cfg.voice);
        console.log("🔊 File vocale creato:", file);
        await sendAudioFile(chatId, file);
        fs.unlink(file, () => {});
        console.log("✅ Risposta testuale e vocale inviata.");
      } catch (e) {
        console.error("⚠️ TTS fallita:", e.message);
      }
    }

  } catch (err) {
    console.error("❌ Errore generale:", err?.message);
  }
  res.sendStatus(200);
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
