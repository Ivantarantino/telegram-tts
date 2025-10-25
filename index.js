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

// ENVIRONMENT
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OPENAI_API_KEY || !PUBLIC_BASE_URL) {
  console.error("Manca una variabile d'ambiente obbligatoria (TELEGRAM_TOKEN | OPENAI_API_KEY | PUBLIC_BASE_URL).");
  process.exit(1);
}

// PATHS
const TEMP_DIR = path.join(__dirname, "temp");
const DATA_DIR = path.join(__dirname, "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");
fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// OPENAI CLIENT
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// CONFIGURAZIONE PERSISTENTE
let state = configManager.loadConfig() || {
  lang: "it",
  model: "gpt-4o-mini",
  mode: "hy",
  voice: { model: "openai", tone: "neutro" },
  weights: { sim: 0.5, imp: 0.3, rec: 0.2 },
  essence: null,
};

function persistConfig(update = {}) {
  state = { ...state, ...update };
  configManager.saveConfig(state);
}

// EXPRESS + TELEGRAM WEBHOOK
const app = express();
app.use(express.json());

const bot = new TelegramBot(BOT_TOKEN, { polling: false, filepath: false });
const WEBHOOK_PATH = `/bot${BOT_TOKEN}`;

app.post(WEBHOOK_PATH, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

(async () => {
  try {
    await bot.deleteWebHook();
    await bot.setWebHook(`${PUBLIC_BASE_URL}${WEBHOOK_PATH}`);
    console.log(`Webhook impostato su: ${PUBLIC_BASE_URL}${WEBHOOK_PATH}`);
  } catch (err) {
    console.error("Errore webhook:", err);
  }
})();

app.listen(PORT, () => {
  console.log(`Server attivo su porta ${PORT}`);
});

// ----------------------------------------------------------
// UTILITIES
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// TEXT TO SPEECH
async function ttsToOgg(text) {
  const filename = `tts-${Date.now()}.ogg`;
  const filePath = path.join(TEMP_DIR, filename);
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
    format: "opus",
  });
  const buffer = Buffer.from(await speech.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return { filePath, buffer };
}

async function replyTextAndVoice(chatId, text) {
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  try {
    const { buffer } = await ttsToOgg(text);
    await bot.sendVoice(chatId, buffer, {}, { filename: `tts-${Date.now()}.ogg`, contentType: "audio/ogg" });
  } catch (err) {
    console.error("Errore TTS:", err.message);
  }
}

// EMBEDDING / ESSENCE
const EMB_MODEL = "text-embedding-3-small";
async function embed(text) {
  const res = await openai.embeddings.create({ model: EMB_MODEL, input: text });
  return res.data[0].embedding;
}

// ----------------------------------------------------------
// GESTIONE TELEGRAM
const pendingClear = new Map();

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() || "";

  // RESET /CLEAR
  if (pendingClear.get(chatId)) {
    pendingClear.delete(chatId);
    if (text.toLowerCase() === "y") {
      state = configManager.resetConfig();
      return bot.sendMessage(chatId, "🔄 Memoria e configurazione ripristinate.");
    }
    return bot.sendMessage(chatId, "Reset annullato.");
  }

  // COMANDI
  if (text.startsWith("/")) {
    const [cmd, arg1] = text.split(/\s+/);
    switch (cmd.toLowerCase()) {
      case "/start":
        return bot.sendMessage(chatId, "💠 Benvenuto in IRIS – usa /help per i comandi disponibili.", { parse_mode: "Markdown" });
      case "/help":
        return bot.sendMessage(chatId, "Comandi disponibili:\n/config\n/mode\n/lang\n/clear\n/essence\n/memory", { parse_mode: "Markdown" });
      case "/mode":
        if (!arg1) return bot.sendMessage(chatId, `Modalità attuale: ${state.mode}\nUsa /mode free | book | hy`);
        state.mode = arg1;
        persistConfig({ mode: arg1 });
        return bot.sendMessage(chatId, `Modalità impostata su ${arg1}`);
      case "/lang":
        if (!arg1) return bot.sendMessage(chatId, `Lingua attuale: ${state.lang}\nUsa /lang it | en`);
        state.lang = arg1;
        persistConfig({ lang: arg1 });
        return bot.sendMessage(chatId, `Lingua impostata su ${arg1}`);
      case "/clear":
        pendingClear.set(chatId, true);
        return bot.sendMessage(chatId, "⚠️ Confermi reset completo? Rispondi Y/N.");
      default:
        return bot.sendMessage(chatId, "❓ Comando non riconosciuto. Usa /help");
    }
  }

  // RISPOSTE NORMALI
  try {
    let answerText = "";

    if (state.mode === "book") {
      const ctx = await ragSearch(text);
      const sys = "Rispondi solo usando il contesto fornito. Se non trovi nulla, dillo chiaramente.";
      const completion = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `${ctx}\n\nDomanda: ${text}` },
        ],
        temperature: 0.7,
      });
      answerText = completion.choices[0].message.content.trim();
    } else if (state.mode === "hy") {
      const ctx = await ragSearch(text);
      const sys = "Integra il contesto e la conoscenza interna. Se il contesto è povero, rispondi normalmente.";
      const completion = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `${ctx}\n\nDomanda: ${text}` },
        ],
        temperature: 0.7,
      });
      answerText = completion.choices[0].message.content.trim();
    } else {
      const completion = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS, un assistente sintetico e gentile." },
          { role: "user", content: text },
        ],
        temperature: 0.7,
      });
      answerText = completion.choices[0].message.content.trim();
    }

    await processMemory(text, answerText);
    await replyTextAndVoice(chatId, answerText);
  } catch (err) {
    console.error("Errore nel flusso messaggi:", err);
    bot.sendMessage(chatId, "⚠️ Ho avuto un errore, riprova.");
  }
});
