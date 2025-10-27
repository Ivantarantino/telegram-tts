// =====================================================
// IRIS 3.9.1 — Hybrid Mode & Upload PDF
// Telegram + Whisper + GPT-4o-mini + Qdrant + TTS
// - Niente doppi messaggi
// - Menu completo e coerente
// - Upload PDF da chat (indicizzato in Qdrant)
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
import { ragSearch, ingestPdf } from "./ragSearch.js";

const VERSION = "3.9.1";

// =====================================================
// ENVIRONMENT VARIABLES
// =====================================================
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OPENAI_API_KEY) {
  console.error("❌ Manca TELEGRAM_TOKEN o OPENAI_API_KEY.");
  process.exit(1);
}

// =====================================================
// PATHS
// =====================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "temp");
const DATA_DIR = path.join(__dirname, "data");
fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// =====================================================
// OPENAI
// =====================================================
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// =====================================================
// CONFIGURAZIONE BASE
// =====================================================
initConfig();
const cfg = getConfig();

const state = {
  mode: cfg.mode || "hy",
  lang: cfg.language || "it",
  model: cfg.model || "gpt-4o-mini",
  voice: {
    model: (cfg.voice && cfg.voice.model) ? cfg.voice.model : (cfg.voice || "gpt_openai"),
    tone: cfg.voice_mode || (cfg.voice && cfg.voice.tone) || "it_female"
  }
};

updateConfig({
  mode: state.mode,
  language: state.lang,
  model: state.model,
  voice: state.voice.model,
  voice_mode: state.voice.tone
});
printConfig();

// =====================================================
// TELEGRAM BOT + SERVER
// =====================================================
const USE_WEBHOOK = !!PUBLIC_BASE_URL;
const bot = new TelegramBot(BOT_TOKEN, { polling: !USE_WEBHOOK });

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
app.get("/", (_, res) =>
  res.status(200).send(`💠 IRIS ${VERSION} – Iris Bella Mode attiva 💎`)
);
app.listen(PORT, () => console.log(`🌍 Server attivo su porta ${PORT}`));

// =====================================================
// UTILS
// =====================================================
function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200)
          return reject(new Error(`Download fallito: ${res.statusCode}`));
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(destPath)));
      })
      .on("error", (err) => fs.unlink(destPath, () => reject(err)));
  });
}

async function ttsToOpusOgg(text) {
  const clean = (text || "").replace(/⚡/g, "");
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

async function respondTextAndVoice(chatId, text) {
  await bot
    .sendMessage(chatId, text, { parse_mode: "Markdown" })
    .catch(() => bot.sendMessage(chatId, text));
  try {
    const voicePath = await ttsToOpusOgg(text);
    await bot.sendVoice(
      chatId,
      voicePath,
      {},
      { filename: path.basename(voicePath), contentType: "audio/ogg" }
    );
  } catch (err) {
    console.error("Errore TTS:", err);
  }
}

// =====================================================
// FILTRI E GUARDIANI
// =====================================================
function checkDajeIntent(text) {
  if (!text) return false;
  const dajeIsolato = /(^|\s)(daje+|dajeee+|daie+)([!?.\s]|$)/i;
  const invocazioneDiretta = /(iris[,!\s]*)?\s*daje+[!.\s]*$/i;
  return dajeIsolato.test(text) || invocazioneDiretta.test(text);
}

// =====================================================
// MESSAGE HANDLER
// =====================================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // Evita doppi eventi e messaggi non testuali
  if (msg.voice || msg.audio || msg.document) return;
  if (!text || text === "/" || text.length < 1) return;

  // Comandi
  if (text.startsWith("/")) {
    switch (true) {
      case /^\/(help|menu)$/i.test(text):
        return bot.sendMessage(
          chatId,
          [
            "🧭 *Comandi IRIS*",
            "/mode → modalità (books | free | hy)",
            "/essence → firma vibrazionale",
            "/weights → mostra/imposta pesi (es: /weights 0.6 0.5 0.7)",
            "/voice → voce e tono",
            "/lang → lingua (it | en)",
            "/model → modello GPT",
            "/clear → svuota memoria conversazionale",
            "/config → mostra configurazione"
          ].join("\n"),
          { parse_mode: "Markdown" }
        );

      case /^\/config$/i.test(text): {
        const c = getConfig();
        const msgCfg = [
          "⚙️ *Configurazione Attuale*",
          `• Mode: ${c.mode}`,
          `• Language: ${c.language}`,
          `• Model: ${c.model}`,
          `• Voice: ${c.voice}`,
          `• Voice mode: ${c.voice_mode}`,
          `• Version: ${VERSION}`
        ].join("\n");
        return bot.sendMessage(chatId, msgCfg, { parse_mode: "Markdown" });
      }

      case /^\/clear$/i.test(text):
        await processMemory("", "");
        return bot.sendMessage(chatId, "🧹 Memoria conversazionale pulita.");

      case /^\/lang\s+(it|en)$/i.test(text): {
        const L = text.split(/\s+/)[1].toLowerCase();
        state.lang = L;
        updateConfig({ language: L });
        return bot.sendMessage(chatId, `✅ Lingua impostata: *${L}*`, { parse_mode: "Markdown" });
      }

      case /^\/mode\s+(books|free|hy)$/i.test(text): {
        const m = text.split(/\s+/)[1].toLowerCase();
        state.mode = m;
        updateConfig({ mode: m });
        return bot.sendMessage(chatId, `✅ Modalità impostata: *${m}*`, { parse_mode: "Markdown" });
      }

      case /^\/essence$/i.test(text): {
        const e = await getEssence();
        return bot.sendMessage(chatId, e, { parse_mode: "Markdown" });
      }

      case /^\/weights$/i.test(text): {
        const w = getWeights();
        return bot.sendMessage(
          chatId,
          `⚖️ Pesi attuali:\n• Cuore: ${w.cuore}\n• Anima: ${w.anima}\n• Visione: ${w.visione}`,
          { parse_mode: "Markdown" }
        );
      }

      default:
        return bot.sendMessage(
          chatId,
          "❔ Comando non riconosciuto. Scrivi */menu* per l’elenco.",
          { parse_mode: "Markdown" }
        );
    }
  }

  // Messaggi normali
  await handleUserQuery(chatId, text, msg.from?.username || "anon");
});

// =====================================================
// UPLOAD PDF — ingest in Qdrant
// =====================================================
bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  const doc = msg.document;
  const isPdf =
    doc?.mime_type?.includes("pdf") || /\.pdf$/i.test(doc?.file_name || "");
  if (!isPdf)
    return bot.sendMessage(chatId, "Posso accettare solo PDF per l’archiviazione nei libri 🙏");

  try {
    const file = await bot.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const local = path.join(TEMP_DIR, `${Date.now()}-${doc.file_name || "file.pdf"}`);
    await downloadToFile(fileUrl, local);

    const res = await ingestPdf(local);
    await bot.sendMessage(
      chatId,
      `📚 PDF indicizzato in memoria libri.\nPagine ≈ ${res.pages} • Chunk: ${res.chunks}`
    );
  } catch (err) {
    console.error("❌ Errore ingest PDF:", err);
    await bot.sendMessage(chatId, "⚙️ Non sono riuscita a caricare il PDF, riprova.");
  }
});

// =====================================================
// VOICE HANDLER
// =====================================================
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
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
    if (!userMessage)
      return bot.sendMessage(chatId, "⚙️ Non ho colto il vocale, puoi ripetere?");
    console.log(`🎧 [VOICE] ${msg.from?.username || "anon"} → "${userMessage}"`);
    await handleUserQuery(chatId, userMessage, msg.from?.username || "anon");
  } catch (error) {
    console.error("❌ Errore vocale:", error);
    await bot.sendMessage(chatId, "⚙️ C'è stato un intoppo con il vocale, riprova tra poco.");
  }
});

// =====================================================
// CORE LOGIC
// =====================================================
async function handleUserQuery(chatId, userMessage, username = "anon") {
  try {
    const userHasDajeIntent = checkDajeIntent(userMessage);
    let answer;

    if (state.mode === "books") {
      answer = await ragSearch(userMessage);
    } else if (state.mode === "free") {
      const completion = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS. Linguaggio naturale, caldo e consapevole." },
          { role: "user", content: userMessage }
        ],
        temperature: 0.8
      });
      answer = completion.choices[0].message.content?.trim() || "Dimmi pure.";
    } else {
      answer = await ragSearch(userMessage);
    }

    if (userHasDajeIntent)
      return respondTextAndVoice(chatId, "Che il Daje sia con Noi 💎");

    await respondTextAndVoice(chatId, answer);
    const cleanUser = (userMessage || "").trim();
    if (cleanUser) await processMemory(cleanUser, answer);
  } catch (err) {
    console.error("❌ Errore nel processamento messaggio:", err);
    await bot.sendMessage(
      chatId,
      "⚙️ Si è verificato un piccolo errore temporaneo. Riprova tra poco."
    );
  }
}
