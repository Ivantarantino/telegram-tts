// =====================================================
// IRIS 3.8.8 – Memoria Espansa e Cuore Vibrazionale
// Telegram + Whisper + GPT-4o-mini + Qdrant + Daje Trigger
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
import { getEssence } from "./essence.js";
import { ragSearch } from "./ragSearch.js";

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OPENAI_API_KEY) {
  console.error("❌ Manca TELEGRAM_TOKEN o OPENAI_API_KEY.");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "temp");
fs.mkdirSync(TEMP_DIR, { recursive: true });

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

initConfig();
const cfg = getConfig();

const state = {
  mode: cfg.mode || "hy",
  lang: cfg.language || "it",
  model: cfg.model || "gpt-4o-mini",
  voice: {
    model: cfg.voice || "gpt_openai",
    tone: cfg.voice_mode || "it_female"
  }
};
updateConfig(state);
printConfig();

const USE_WEBHOOK = !!PUBLIC_BASE_URL;
const bot = new TelegramBot(BOT_TOKEN, { polling: !USE_WEBHOOK });

// Webhook/Polling
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
app.get("/", (_, res) => res.status(200).send("IRIS 3.8.8 – Cuore Vibrazionale attiva 💎"));
app.listen(PORT, () => console.log(`🌍 Server attivo su porta ${PORT}`));

// =====================================================
// UTILS
// =====================================================
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
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" }).catch(() => bot.sendMessage(chatId, text));
  try {
    const voicePath = await ttsToOpusOgg(text);
    await bot.sendVoice(chatId, voicePath, {}, { filename: path.basename(voicePath), contentType: "audio/ogg" });
  } catch (err) {
    console.error("Errore TTS:", err);
  }
}

// =====================================================
// COMANDI BASE
// =====================================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // ---- Daje Trigger ----
  const dajeRegex = /\b(daje+|dajeee+|brava\s*iris.*daje+)\b/i;
  if (dajeRegex.test(text)) {
    return respondTextAndVoice(chatId, "Che il Daje sia con Noi 💎");
  }

  if (text.startsWith("/")) {
    const [cmd, arg1, arg2] = text.split(/\s+/);
    switch (cmd) {
      case "/start":
        return bot.sendMessage(chatId, "Ciao, sono IRIS 3.8.8 – Cuore Vibrazionale 💎 Usa /help per i miei comandi.");
      case "/help":
        return bot.sendMessage(chatId,
          [
            "*🧭 Comandi IRIS*",
            "",
            "/mode → modalità cognitiva (books | free | hy)",
            "/voice → voce e tono",
            "/lang → lingua (it | en | ru)",
            "/model → modello GPT (gpt-4o-mini | gpt-4o)",
            "/essence → firma vibrazionale (Cuore, Anima, Visione)",
            "/config → mostra configurazione corrente"
          ].join("\n"), { parse_mode: "Markdown" });

      case "/config": {
        const current = getConfig();
        const msgConfig = [
          "⚙️ *Configurazione attuale*",
          "",
          `• Mode: \`${current.mode}\``,
          `• Language: \`${current.language}\``,
          `• Model: \`${current.model}\``,
          `• Voice: \`${current.voice}\``,
          `• Voice mode: \`${current.voice_mode}\``,
          `• Version: \`3.8.8\``
        ].join("\n");
        return bot.sendMessage(chatId, msgConfig, { parse_mode: "Markdown" });
      }

      case "/essence": {
        const ess = await getEssence();
        return bot.sendMessage(chatId, ess, { parse_mode: "Markdown" });
      }

      default:
        return bot.sendMessage(chatId, "Comando non riconosciuto. Usa /help.");
    }
  }

  if (text) await handleUserQuery(chatId, text, msg.from?.username || "anon");
});

// =====================================================
// GESTIONE VOCALI
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
    if (!userMessage) return bot.sendMessage(chatId, "⚙️ Non ho colto il vocale, puoi ripetere?");
    console.log(`🎧 [VOICE] ${msg.from?.username || "anon"} → "${userMessage}"`);
    await handleUserQuery(chatId, userMessage, msg.from?.username || "anon");
  } catch (error) {
    console.error("❌ Errore vocale:", error);
    await bot.sendMessage(chatId, "⚙️ C'è stato un intoppo con il vocale, riprova tra poco.");
  }
});

// =====================================================
// ELABORAZIONE TESTO
// =====================================================
async function handleUserQuery(chatId, userMessage, username = "anon") {
  try {
    let answer;
    if (state.mode === "books") answer = await ragSearch(userMessage);
    else if (state.mode === "free") {
      const completion = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS. Parli in modo naturale e presente." },
          { role: "user", content: userMessage }
        ],
        temperature: 0.8
      });
      answer = completion.choices[0].message.content.trim();
    } else {
      answer = await ragSearch(userMessage);
    }

    await respondTextAndVoice(chatId, answer);
    await processMemory(userMessage, answer);
  } catch (err) {
    console.error("❌ Errore nel processamento messaggio:", err);
    await bot.sendMessage(chatId, "⚙️ Si è verificato un piccolo errore temporaneo. Riprova tra poco.");
  }
}
