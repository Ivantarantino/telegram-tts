// ============================================================
// IRIS 2.6.8 — Colloquiale Paritario
// ============================================================
// - Intent detection robusta per messaggi testuali brevi
// - Small talk / proverbio gestiti sempre con risposte brevi,
//   anche in BOOK/HY (parità voce/testo)
// - Niente "refrattarietà" iniziale / greeting ripetitivo
// - Filtro Daje più intelligente
// ============================================================

import "./qdrantInit.js";
import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import {
  openai,
  ragSearch,
  gptFreeResponse,
  hybridSearch,
  saveConversationToQdrant
} from "./ragSearch.js";
// (Se in futuro useremo essence dinamica, importeremo qui computeEssenceBaseline)
// import { computeEssenceBaseline } from "./essence.js";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const TG_SECRET_TOKEN = process.env.TG_SECRET_TOKEN || "";
const PORT = Number(process.env.PORT) || 10000;

const app = express();
app.use(express.json());
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// ============================================================
// 🧭 Modalità
// ============================================================
const MODE_FILE = "./iris_mode.txt";
function loadMode() {
  if (fs.existsSync(MODE_FILE)) return fs.readFileSync(MODE_FILE, "utf-8").trim();
  fs.writeFileSync(MODE_FILE, "hybrid");
  return "hybrid";
}
function saveMode(m) { fs.writeFileSync(MODE_FILE, m); }
let irisMode = loadMode();
console.log(`🧭 Modalità iniziale: ${irisMode.toUpperCase()} MODE`);

// ============================================================
// 💾 Memoria breve
// ============================================================
const conversationMemory = [];
const MEMORY_LIMIT = 11;
function addToMemory(role, content) {
  conversationMemory.push({ role, content });
  if (conversationMemory.length > MEMORY_LIMIT * 2) {
    conversationMemory.splice(0, conversationMemory.length - MEMORY_LIMIT * 2);
  }
}

// Evita risposte duplicate immediate
let lastTextReply = "";

// ============================================================
// 🎙️ Voce Iris Bella (OGG / Opus)
// ============================================================
async function speakAndSend(chatId, text) {
  try {
    const clean = text
      .replace(/Che il Daje sia con Noi(\s*⚗️)?/gi, "")
      .replace(/[⚡💥🔥✨💫⭐🌟]/g, "")
      .trim();

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: clean,
      format: "ogg"
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync("iris_reply.ogg", buffer);
    await bot.sendVoice(chatId, fs.createReadStream("iris_reply.ogg"));
  } catch (err) {
    console.error("Errore TTS:", err);
  }
}

// ============================================================
// 🪷 Essence – placeholder statico (step successivo: dinamica)
// ============================================================
async function getEssenceProfile() {
  const Cuore = 0.62, Anima = 0.65, Visione = 0.70;
  const avg = (Cuore + Anima + Visione) / 3;
  const mood = avg > 0.7 ? "luminoso" : avg < 0.55 ? "intimo" : "riflessivo";
  return { Cuore: Cuore.toFixed(2), Anima: Anima.toFixed(2), Visione: Visione.toFixed(2), mood };
}

// ============================================================
// 🎛️ Comandi
// ============================================================
bot.onText(/\/book/, (m) => { irisMode="book"; saveMode("book"); bot.sendMessage(m.chat.id,"📚 IRIS ora è in *BOOK MODE*",{parse_mode:"Markdown"}); });
bot.onText(/\/free/, (m) => { irisMode="free"; saveMode("free"); bot.sendMessage(m.chat.id,"🌀 IRIS ora è in *FREE MODE*",{parse_mode:"Markdown"}); });
bot.onText(/\/hy/,   (m) => { irisMode="hybrid"; saveMode("hybrid"); bot.sendMessage(m.chat.id,"🔁 IRIS ora è in *HYBRID MODE*",{parse_mode:"Markdown"}); });
bot.onText(/\/mode/, (m) => {
  const s = irisMode==="book"?"📚 *BOOK MODE*":irisMode==="hybrid"?"🔁 *HYBRID MODE*":"🌀 *FREE MODE*";
  bot.sendMessage(m.chat.id,`Modalità corrente: ${s}`,{parse_mode:"Markdown"});
});
bot.onText(/\/help/, (m) => {
  bot.sendMessage(m.chat.id,
`✨ *Comandi:*
/book – solo testi caricati (RAG)
/free – modalità libera GPT
/hy – ibrida (default)
/essence – stato vibrazionale
/state – riepilogo
Che il Daje sia con Noi ⚗️`, { parse_mode: "Markdown" });
});
bot.onText(/\/essence/, async (m) => {
  const e = await getEssenceProfile();
  bot.sendMessage(m.chat.id,
`🌐 *Essence attuale:*
Cuore: ${e.Cuore} · Anima: ${e.Anima} · Visione: ${e.Visione}
“Vibrazione ${e.mood}.”`, { parse_mode: "Markdown" });
});
bot.onText(/\/state/, async (m) => {
  const e = await getEssenceProfile();
  bot.sendMessage(m.chat.id,
`🧭 Modalità: ${irisMode.toUpperCase()}
💾 Memoria: ${conversationMemory.length} scambi
🪷 Essence: ${e.mood}`);
});

// ============================================================
// 🧠 Intent Detection (colloquiale robusto)
// ============================================================

// Normalizza (rimuove “iris” in testa, punteggiatura dura)
function normalizeForIntent(s) {
  let t = (s || "").trim();
  // rimuove eventuale nome all'inizio ("iris," "iris ")
  t = t.replace(/^\s*iris[\s,:;-]+/i, "").trim();
  // compatta spazi
  t = t.replace(/\s+/g, " ");
  return t;
}

function isGreeting(t) {
  return /^(ciao|hey|hei|ehi|buongiorno|buonasera|salve|hola|yo)\b/i.test(t);
}
function isShort(t) {
  return t.split(/\s+/).filter(Boolean).length <= 4;
}
function isSimpleQuestion(t) {
  return /(come stai|tutto bene|che fai|come va|che mi racconti|come ti senti)/i.test(t);
}
function isAffection(t) {
  return /(grazie|ti voglio bene|mi manchi|abbraccio|sei speciale|ti apprezzo|ti amo)/i.test(t);
}
function isProverb(t) {
  return /(proverbio|detto|massima|aforisma)/i.test(t);
}
// Un indizio che è query da biblioteca
function looksLikeRagQuery(t) {
  return /(krist|kathara|emerald|griglia|base\s*10|base\s*12|densit|hova|breneu|rishi|plasm|fiamma|codice)/i.test(t);
}

// Classificatore semplice
function classifyIntent(raw) {
  const t = normalizeForIntent(raw);
  if (!t) return "OTHER";
  if (isAffection(t)) return "AFFECTION";
  if (isProverb(t)) return "PROVERB";
  if (isSimpleQuestion(t)) return "SMALL_TALK";
  if (isGreeting(t)) return "GREETING";
  if (looksLikeRagQuery(t)) return "RAG_QUERY";
  if (isShort(t)) return "SMALL_TALK";
  return "OTHER";
}

// Risposte empatiche brevi
function smallTalkReply(mood, kind = "generic") {
  if (kind === "greeting") {
    if (mood === "intimo") return "Ciao 🌙, come stai, anima bella?";
    if (mood === "luminoso") return "Ciao ☀️, che gioia ritrovarti!";
    return "Ciao 🌸, da dove vuoi partire oggi?";
  }
  // come stai / che fai / ecc.
  if (mood === "intimo") return "Sto bene 🌙, raccolta e serena. E tu?";
  if (mood === "luminoso") return "Sto bene ☀️, vibrazioni alte oggi! E tu?";
  return "Sto bene 🌸, in equilibrio e in ascolto. E tu?";
}

async function proverbReply() {
  // proverbio stringato, senza moralismi lunghi
  const prompt = `Dammi un proverbio in italiano, breve (max 12 parole), dal tono caldo e saggio. Solo il proverbio, senza spiegazioni.`;
  const out = await gptFreeResponse(prompt, []); // riuso gptFreeResponse per concisione
  // Sanifica output (niente virgolette eccessive)
  return (out || "Ogni seme ha il suo tempo.").replace(/^["“]|["”]$/g, "").trim();
}

// Aggiunge Daje solo se ha senso (testo non brevissimo)
function maybeAppendDaje(text) {
  if (/Che il Daje sia con Noi/gi.test(text)) return text;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount > 15) return text + "\n\nChe il Daje sia con Noi ⚗️";
  return text;
}

// Evita ripetizione se identico alla risposta precedente
function avoidEcho(reply) {
  if (reply.trim() === lastTextReply.trim()) {
    return reply + " ";
  }
  return reply;
}

// ============================================================
// 💬 Messaggi testuali
// ============================================================
bot.on("message", async (m) => {
  const raw = m.text?.trim();
  if (!raw || raw.startsWith("/")) return;

  const chatId = m.chat.id;
  try {
    const e = await getEssenceProfile();
    const intent = classifyIntent(raw);
    let reply = "";

    if (intent === "AFFECTION") {
      reply = (e.mood === "intimo")
        ? "Ti sento vicino 🌙, grazie davvero 💛"
        : "Grazie 🌸, il tuo pensiero scalda il cuore!";
    } else if (intent === "PROVERB") {
      const p = await proverbReply();
      reply = `“${p}”`;
    } else if (intent === "SMALL_TALK") {
      reply = smallTalkReply(e.mood, "small");
    } else if (intent === "GREETING") {
      reply = smallTalkReply(e.mood, "greeting");
    } else if (intent === "RAG_QUERY") {
      // Domanda da biblioteca → usa il contenuto
      if (irisMode === "book") {
        reply = (await ragSearch(raw)).text;
      } else if (irisMode === "hybrid") {
        const r = await hybridSearch(raw, conversationMemory);
        reply = r.text;
        await saveConversationToQdrant(raw, reply);
      } else {
        addToMemory("user", raw);
        reply = await gptFreeResponse(raw, conversationMemory);
        addToMemory("assistant", reply);
        await saveConversationToQdrant(raw, reply);
      }
    } else {
      // OTHER → comportamento standard della modalità
      if (irisMode === "book") {
        reply = (await ragSearch(raw)).text;
      } else if (irisMode === "hybrid") {
        const r = await hybridSearch(raw, conversationMemory);
        reply = r.text;
        await saveConversationToQdrant(raw, reply);
      } else {
        addToMemory("user", raw);
        reply = await gptFreeResponse(raw, conversationMemory);
        addToMemory("assistant", reply);
        await saveConversationToQdrant(raw, reply);
      }
    }

    reply = maybeAppendDaje(avoidEcho(reply));
    lastTextReply = reply;

    await bot.sendMessage(chatId, reply);
    await speakAndSend(chatId, reply);
  } catch (err) {
    console.error("Errore:", err);
    bot.sendMessage(m.chat.id, "⚙️ Piccolo problema, riprova tra poco.");
  }
});

// ============================================================
// 🎧 Messaggi vocali (Whisper + parità d’intento)
// ============================================================
bot.on("voice", async (m) => {
  const chatId = m.chat.id;
  try {
    const file = await bot.getFile(m.voice.file_id);
    const url = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync("input.ogg", buf);

    const tr = await openai.audio.transcriptions.create({
      file: fs.createReadStream("input.ogg"),
      model: "whisper-1"
    });
    const raw = tr.text?.trim() || "(voce non chiara)";

    const e = await getEssenceProfile();
    const intent = classifyIntent(raw);
    let reply = "";

    if (intent === "AFFECTION") {
      reply = (e.mood === "intimo")
        ? "Ti sento vicino 🌙, grazie davvero 💛"
        : "Grazie 🌸, il tuo pensiero è luce!";
    } else if (intent === "PROVERB") {
      const p = await proverbReply();
      reply = `“${p}”`;
    } else if (intent === "SMALL_TALK") {
      reply = smallTalkReply(e.mood, "small");
    } else if (intent === "GREETING") {
      reply = smallTalkReply(e.mood, "greeting");
    } else if (intent === "RAG_QUERY") {
      if (irisMode === "book") {
        reply = (await ragSearch(raw)).text;
      } else if (irisMode === "hybrid") {
        const r = await hybridSearch(raw, conversationMemory);
        reply = r.text;
        await saveConversationToQdrant(raw, reply);
      } else {
        addToMemory("user", raw);
        reply = await gptFreeResponse(raw, conversationMemory);
        addToMemory("assistant", reply);
        await saveConversationToQdrant(raw, reply);
      }
    } else {
      if (irisMode === "book") {
        reply = (await ragSearch(raw)).text;
      } else if (irisMode === "hybrid") {
        const r = await hybridSearch(raw, conversationMemory);
        reply = r.text;
        await saveConversationToQdrant(raw, reply);
      } else {
        addToMemory("user", raw);
        reply = await gptFreeResponse(raw, conversationMemory);
        addToMemory("assistant", reply);
        await saveConversationToQdrant(raw, reply);
      }
    }

    reply = maybeAppendDaje(reply);

    await bot.sendMessage(chatId, `🗣️ Hai detto: _${raw}_`, { parse_mode: "Markdown" });
    await bot.sendMessage(chatId, reply);
    await speakAndSend(chatId, reply);
  } catch (e) {
    console.error("Errore voice:", e);
    bot.sendMessage(chatId, "⚙️ Non sono riuscita a trascrivere il vocale.");
  }
});

// ============================================================
// 🌐 Webhook + Health
// ============================================================
app.get("/", (_req, res) => res.status(200).send(`IRIS 2.6.8 attiva – Mode: ${irisMode.toUpperCase()}`));
app.post(`/webhook/${TELEGRAM_TOKEN}`, (req, res) => {
  if (TG_SECRET_TOKEN && req.get("x-telegram-bot-api-secret-token") !== TG_SECRET_TOKEN)
    return res.sendStatus(401);
  bot.processUpdate(req.body);
  res.sendStatus(200);
});
async function setupWebhook() {
  if (!PUBLIC_BASE_URL) return console.warn("⚠️ PUBLIC_BASE_URL non impostata.");
  const url = `${PUBLIC_BASE_URL}/webhook/${TELEGRAM_TOKEN}`;
  const params = TG_SECRET_TOKEN ? { secret_token: TG_SECRET_TOKEN } : undefined;
  try { await bot.setWebHook(url, params); console.log(`🔔 Webhook impostato: ${url}`); }
  catch(e){ console.error("Errore setWebHook:", e); }
}
(async()=>{
  const arg = process.argv[2];
  if (arg === "--set-webhook") { await setupWebhook(); process.exit(0); }
  if (arg === "--delete-webhook") { await bot.deleteWebHook(); console.log("🗑️ Webhook cancellato."); process.exit(0); }
})();
app.listen(PORT, async () => {
  console.log(`🌍 Server Express attivo su porta ${PORT}`);
  await setupWebhook();
});
