// =====================================================
// IRIS 3.9.0 – Rinascita HY stabile
// Telegram + Whisper + GPT-4o-mini + TTS + Qdrant (RAG)
// - Webhook auto (se PUBLIC_BASE_URL) altrimenti polling
// - Daje solo su invocazione (ingresso + uscita) con guard
// - Comandi completi: /menu /config /mode /model /lang /voice
//                      /essence /weights /saveweights
//                      /memory /clear
// - Niente intrusioni in gruppi: risponde solo su menzione/“Iris”/Daje
// - Fix Telegram Markdown: NIENTE parse_mode sui testi generati
// =====================================================

import fs from "fs";
import path from "path";
import https from "https";
import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import { fileURLToPath } from "url";

import { initConfig, getConfig, updateConfig, printConfig } from "./configManager.js";
import { processMemory } from "./memoryManager.js";
import { getEssence, getWeights, setWeights, saveWeights } from "./essence.js";
import { ragSearch } from "./ragSearch.js";

// ---------- ENV ----------
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OPENAI_API_KEY) {
  console.error("❌ Manca TELEGRAM_TOKEN o OPENAI_API_KEY.");
  process.exit(1);
}

// ---------- PATHS ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "temp");
const DATA_DIR = path.join(__dirname, "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");
fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- OPENAI ----------
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ---------- CONFIG INIT ----------
initConfig();
const cfg = getConfig();

const state = {
  mode: cfg.mode || "hy",                 // hy | free | books
  lang: cfg.language || "it",
  model: cfg.model || "gpt-4o-mini",
  voice: {
    model: (cfg.voice && cfg.voice.model) ? cfg.voice.model : (cfg.voice || "gpt_openai"),
    tone: cfg.voice_mode || (cfg.voice && cfg.voice.tone) || "it_female"
  },
  version: "3.9.0",
};

// Persiste lo stato attuale in config
updateConfig({
  mode: state.mode,
  language: state.lang,
  model: state.model,
  voice: state.voice.model,
  voice_mode: state.voice.tone,
  version: state.version
});
printConfig();

// ---------- TELEGRAM ----------
const USE_WEBHOOK = !!PUBLIC_BASE_URL;
const bot = new TelegramBot(BOT_TOKEN, { polling: !USE_WEBHOOK });

// memo username del bot per rilevare menzioni in gruppi
let BOT_USERNAME = "";
(async () => {
  try {
    const me = await bot.getMe();
    BOT_USERNAME = me.username || "";
  } catch (e) {
    console.error("⚠️ Impossibile ottenere username bot:", e?.message);
  }
})();

// Web server (webhook o keepalive)
let app = express();
if (USE_WEBHOOK) {
  app.use(bodyParser.json());
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
}
app.get("/", (_, res) => res.status(200).send(`IRIS ${state.version} – HY stabile 💎`));
app.listen(PORT, () => console.log(`🌍 Server attivo su porta ${PORT}`));

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

async function ttsToOpusOgg(text) {
  const clean = (text || "").replace(/[⚡]/g, "");
  const filename = `tts-${Date.now()}.ogg`;
  const filePath = path.join(TEMP_DIR, filename);
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: clean,
    format: "opus"
  });
  const buf = Buffer.from(await speech.arrayBuffer());
  fs.writeFileSync(filePath, buf);
  return filePath;
}

// invio sicuro: niente Markdown sui testi “generati” per evitare ETELEGRAM 400
async function sendText(chatId, text, { markdown = false } = {}) {
  try {
    if (markdown) {
      // Per i soli menu/statici usiamo Markdown semplice ma ben chiuso
      return await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    }
    return await bot.sendMessage(chatId, text);
  } catch (err) {
    // fallback senza parse_mode
    try { return await bot.sendMessage(chatId, text); }
    catch (e) {
      console.error("❌ Errore invio messaggio:", e?.message);
    }
  }
}

async function respondTextAndVoice(chatId, text, { markdown = false } = {}) {
  // testo
  await sendText(chatId, text, { markdown });
  // voce
  try {
    const voicePath = await ttsToOpusOgg(text);
    await bot.sendVoice(chatId, voicePath, {}, { filename: path.basename(voicePath), contentType: "audio/ogg" });
  } catch (err) {
    console.error("Errore TTS:", err?.message || err);
  }
}

// ---------- DAJE GUARD ----------
function checkDajeIntent(text) {
  if (!text) return false;
  const dajeIsolato = /(^|\s)(daje+|dajeee+|daie+)([!?.\s]|$)/i;
  const invocazioneAffettiva =
    /(brava|bravissima|forte|mitica|grand(e|iosa)|grazie|sei fantastica|sei forte)\s*[,!\s]*iris[,!\s]*.*daje+[!.\s]*$/i;
  const invocazioneDiretta = /(iris[,!\s]*)?\s*daje+[!.\s]*$/i;
  return dajeIsolato.test(text) || invocazioneAffettiva.test(text) || invocazioneDiretta.test(text);
}

function sanitizeAnswer(answer, userTextHadDajeIntent) {
  if (userTextHadDajeIntent) return answer;
  const sigilloAnywhere = /(che\s+il\s+)?daje\s*(sia)?\s*(con)?\s*(noi)[!.\s]*[💎✨💫⭐️⚡️]*/gi;
  let cleaned = (answer || "").replace(sigilloAnywhere, "").trim();
  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
  if (!cleaned) cleaned = "Ricevuto.";
  return cleaned;
}

// ---------- POLICY GRUPPI: rispondi solo se chiamata ----------
function shouldReplyInChat(msg, userHasDajeIntent) {
  const chatType = msg.chat?.type; // "private" | "group" | "supergroup" | "channel"
  if (chatType === "private") return true; // sempre in DM

  // in gruppi: solo se invocata
  const text = (msg.text || "").toLowerCase();
  const mentioned = (msg.entities || []).some((e) => e.type === "mention") && BOT_USERNAME
    ? text.includes(`@${BOT_USERNAME.toLowerCase()}`)
    : false;

  const calledByName = /\biris\b[,:!\s]?/i.test(msg.text || "");
  const isReplyToIris = !!msg.reply_to_message && msg.reply_to_message.from && msg.reply_to_message.from.username === BOT_USERNAME;

  return userHasDajeIntent || mentioned || calledByName || isReplyToIris;
}

// ---------- CONFERME PENDING (per /clear) ----------
const pendingConfirm = new Map(); // chatId -> { action: 'clear_memory', expiresAt }

// ---------- COMANDI & MESSAGGI ----------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // Gestione conferme Y/N (solo se in pending)
  const pend = pendingConfirm.get(chatId);
  if (pend && !text.startsWith("/")) {
    const ans = text.toLowerCase();
    if (ans === "y" || ans === "yes" || ans === "si" || ans === "sì") {
      if (pend.action === "clear_memory") {
        try {
          if (fs.existsSync(MEMORY_FILE)) fs.writeFileSync(MEMORY_FILE, "[]");
          pendingConfirm.delete(chatId);
          return sendText(chatId, "🧹 Memoria locale cancellata.");
        } catch (e) {
          pendingConfirm.delete(chatId);
          return sendText(chatId, "⚠️ Errore durante la cancellazione memoria.");
        }
      }
    } else if (ans === "n" || ans === "no") {
      pendingConfirm.delete(chatId);
      return sendText(chatId, "❎ Annullato. La memoria rimane intatta.");
    }
    // se era pending ma il messaggio non è Y/N, lo ignoriamo e proseguiamo oltre
  }

  const userHasDajeIntent = checkDajeIntent(text);

  // Daje rituale immediato (solo se NON comando)
  if (!text.startsWith("/") && userHasDajeIntent) {
    return respondTextAndVoice(chatId, "Che il Daje sia con Noi 💎");
  }

  // --- COMANDI ---
  if (text.startsWith("/")) {
    const [cmd, arg1, arg2] = text.split(/\s+/);

    switch (cmd) {
      case "/start":
        return sendText(chatId,
          `Ciao 🌸 Sono IRIS ${state.version} – HY stabile. Scrivi /menu per i comandi.`);

      case "/help":
      case "/menu":
        return sendText(chatId,
`🧭 Comandi IRIS

/config        → mostra configurazione corrente
/mode          → modalità cognitiva (books | free | hy)
/model         → modello GPT (gpt-4o-mini | gpt-4o)
/lang          → lingua (it | en | ru)
/voice         → voce e timbro (model|tone)
/essence       → mostra firma vibrazionale (Cuore, Anima, Visione)
/weights       → mostra o imposta pesi dell'Essenza
/saveweights   → salva i pesi attuali
/memory        → stato memoria locale
/clear         → cancella memoria locale (richiede Y/N)`, { markdown: false });

      // ---------- CONFIG ----------
      case "/config": {
        const current = getConfig();
        const voiceModel = current.voice?.model || current.voice || "gpt_openai";
        const msgConfig = [
          "⚙️ Configurazione attuale",
          `• Mode: ${current.mode}`,
          `• Language: ${current.language}`,
          `• Model: ${current.model}`,
          `• Voice: ${voiceModel}`,
          `• Voice mode: ${current.voice_mode}`,
          `• Version: ${state.version}`
        ].join("\n");
        return sendText(chatId, msgConfig);
      }

      // ---------- LINGUA / MODE / MODEL / VOICE ----------
      case "/lang":
        if (!arg1) return sendText(chatId, `🌐 Lingua attuale: ${state.lang}\nCambia con: /lang it | en | ru`);
        if (!["it", "en", "ru"].includes(arg1)) return sendText(chatId, "Valore non valido.");
        state.lang = arg1;
        updateConfig({ language: arg1 });
        return sendText(chatId, `Lingua impostata su ${arg1}`);

      case "/mode":
        if (!arg1) return sendText(chatId, `🧭 Modalità attuale: ${state.mode}\nCambia con: /mode books | free | hy`);
        if (!["books", "free", "hy"].includes(arg1.toLowerCase())) return sendText(chatId, "Valore non valido.");
        state.mode = arg1.toLowerCase();
        updateConfig({ mode: state.mode });
        return sendText(chatId, `Modalità impostata su ${state.mode}`);

      case "/model":
        if (!arg1) return sendText(chatId, `🧠 Modello attuale: ${state.model}\nCambia con: /model gpt-4o-mini | gpt-4o`);
        if (!["gpt-4o-mini", "gpt-4o"].includes(arg1)) return sendText(chatId, "Valore non valido.");
        state.model = arg1;
        updateConfig({ model: arg1 });
        return sendText(chatId, `Modello impostato su ${arg1}`);

      case "/voice":
        if (!arg1) {
          return sendText(chatId,
            `🎙️ Voce: ${state.voice.model} | Timbro: ${state.voice.tone}
Cambia con:
  /voice model gpt_openai | google_tts | bark
  /voice tone it_female | it_male | empatico | profondo | giocoso`);
        }
        if (arg1 === "model" && arg2) {
          if (!["gpt_openai", "google_tts", "bark"].includes(arg2)) return sendText(chatId, "Modello voce non valido.");
          state.voice.model = arg2;
          updateConfig({ voice: arg2 });
          return sendText(chatId, `🎧 Voice model impostato su ${arg2}`);
        }
        if (arg1 === "tone" && arg2) {
          state.voice.tone = arg2;
          updateConfig({ voice_mode: arg2 });
          return sendText(chatId, `💫 Timbro impostato su ${arg2}`);
        }
        return sendText(chatId, "Usa /voice model […] o /voice tone […].");

      // ---------- ESSENZA & PESI ----------
      case "/essence":
        return sendText(chatId, await getEssence());

      case "/weights": {
        const w = getWeights();
        if (!arg1 || !arg2)
          return sendText(chatId,
`⚖️ Pesi attuali
Cuore: ${w.cuore}
Anima: ${w.anima}
Visione: ${w.visione}

Per cambiare: /weights cuore 0.7 (o anima / visione)`);
        const key = arg1.toLowerCase();
        if (!["cuore", "anima", "visione"].includes(key)) return sendText(chatId, "Usa: cuore | anima | visione");
        const n = parseFloat(arg2);
        if (isNaN(n) || n < 0 || n > 1) return sendText(chatId, "Valore non valido. Inserisci numero tra 0 e 1.");
        setWeights({ [key]: n });
        return sendText(chatId, `🔹 Peso ${key} impostato su ${n}`);
      }

      case "/saveweights":
        saveWeights();
        return sendText(chatId, "💾 Pesi vibrazionali salvati.");

      // ---------- MEMORIA ----------
      case "/memory": {
        let localCount = 0;
        if (fs.existsSync(MEMORY_FILE)) {
          try {
            const d = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
            localCount = Array.isArray(d) ? d.length : 0;
          } catch {}
        }
        return sendText(chatId, `🧠 Stato memoria\nLocale: ${localCount} record salvati.`);
      }

      case "/clear":
        pendingConfirm.set(chatId, { action: "clear_memory", expiresAt: Date.now() + 60_000 });
        return sendText(chatId, "⚠️ Sei sicuro di voler cancellare la memoria locale? (Y/N)");

      default:
        return sendText(chatId, "Comando non riconosciuto. Usa /menu per consultare i comandi disponibili.");
    }
  }

  // --- MESSAGGI NORMALI ---
  const canReply = shouldReplyInChat(msg, userHasDajeIntent);
  if (!canReply) return; // non intervenire nei gruppi se non chiamata

  if (text && !text.startsWith("/")) {
    await handleUserQuery(chatId, text, msg.from?.username || "anon");
  }
});

// ---------- VOCALI ----------
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;

  // policy gruppi: rispondi solo se chiamata
  const userHasDajeIntent = false; // dal vocale non lo sappiamo prima, gestiamo dopo la trascrizione
  if (msg.chat?.type !== "private" && !msg.reply_to_message) {
    // se è vocale in gruppo e non è reply a Iris, ignoriamo per evitare intrusioni
    return;
  }

  const fileId = msg.voice.file_id;
  try {
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const oggPath = path.join(TEMP_DIR, `voice-${Date.now()}.ogg`);
    await downloadToFile(fileUrl, oggPath);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(oggPath),
      model: "whisper-1",
      language: state.lang || "it"
    });

    const userMessage = (transcription.text || "").trim();
    if (!userMessage) return sendText(chatId, "⚙️ Non ho colto il vocale, puoi ripetere?");
    console.log(`🎧 [VOICE] ${msg.from?.username || "anon"} → "${userMessage}"`);

    // in gruppi: dopo la trascrizione, verifichiamo invocazione
    const invoked = shouldReplyInChat({ ...msg, text: userMessage }, checkDajeIntent(userMessage));
    if (!invoked && msg.chat?.type !== "private") return;

    await handleUserQuery(chatId, userMessage, msg.from?.username || "anon");
  } catch (error) {
    console.error("❌ Errore vocale:", error);
    await sendText(chatId, "⚙️ C'è stato un intoppo con il vocale, riprova tra poco.");
  }
});

// ---------- CORE ----------
async function handleUserQuery(chatId, userMessage, username = "anon") {
  try {
    const userHasDajeIntent = checkDajeIntent(userMessage);

    let answer;
    if (state.mode === "books") {
      console.log(`🔍 RAG | query="${userMessage}" | topK=5`);
      answer = await ragSearch(userMessage);
    } else if (state.mode === "free") {
      const completion = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS. Linguaggio naturale, caldo e presente. Non usare firme automatiche." },
          { role: "user", content: userMessage }
        ],
        temperature: 0.8
      });
      answer = completion.choices?.[0]?.message?.content?.trim() || "Dimmi pure.";
    } else {
      // HYBRID → usa RAG + eventuale completamento
      console.log(`🔍 RAG | query="${userMessage}" | topK=5`);
      const rag = await ragSearch(userMessage);
      const prompt = [
        "Integra con tatto ciò che segue (contesto) con una risposta naturale e coerente al messaggio dell’utente.",
        "Se il contesto è povero o irrilevante, rispondi comunque bene e chiedi 1 domanda di chiarimento, in modo gentile.",
        "Evita firme automatiche o chiusure ripetitive.",
        "",
        "Contesto (RAG):",
        rag,
        "",
        "Messaggio utente:",
        userMessage
      ].join("\n");

      const completion = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS. Linguaggio naturale, caldo e presente. Non usare firme automatiche." },
          { role: "user", content: prompt }
        ],
        temperature: 0.9
      });
      answer = completion.choices?.[0]?.message?.content?.trim() || rag || "Dimmi pure.";
    }

    const safeAnswer = sanitizeAnswer(answer, userHasDajeIntent);

    // Se l’hai evocata, rispondi SOLO con il sigillo (rituale)
    if (userHasDajeIntent) {
      return respondTextAndVoice(chatId, "Che il Daje sia con Noi 💎");
    }

    await respondTextAndVoice(chatId, safeAnswer);
    await processMemory(userMessage, safeAnswer);
  } catch (err) {
    console.error("❌ Errore nel processamento messaggio:", err);
    await sendText(chatId, "⚙️ Si è verificato un piccolo errore temporaneo. Riprova tra poco.");
  }
}
