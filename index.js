// =====================================================
// IRIS 3.9 – Coerenza Dialogica Rinata
// Telegram + Whisper + GPT-4o + TTS + Qdrant
// - HYBRID MODE completo: mente + libro
// - Daje guard attivo
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
fs.mkdirSync(TEMP_DIR, { recursive: true });

// ---------- OPENAI ----------
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ---------- CONFIG ----------
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

// Persiste lo stato attuale
updateConfig({
  mode: state.mode,
  language: state.lang,
  model: state.model,
  voice: state.voice.model,
  voice_mode: state.voice.tone
});
printConfig();

// ---------- TELEGRAM ----------
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
  res.status(200).send("IRIS 3.9 – HYBRID MODE attivo 💎")
);
app.listen(PORT, () => console.log(`🌍 Server attivo su porta ${PORT}`));

// ---------- UTILS ----------
function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode !== 200)
        return reject(new Error(`Download fallito: ${res.statusCode}`));
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
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" })
    .catch(() => bot.sendMessage(chatId, text));
  try {
    const voicePath = await ttsToOpusOgg(text);
    await bot.sendVoice(chatId, voicePath, {},
      { filename: path.basename(voicePath), contentType: "audio/ogg" });
  } catch (err) {
    console.error("Errore TTS:", err);
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
  const sigilloAnywhere =
    /(che\s+il\s+)?daje\s*(sia)?\s*(con)?\s*(noi)[!.\s]*[💎✨💫⭐️⚡️]*/gi;
  let cleaned = answer.replace(sigilloAnywhere, "").trim();
  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
  if (!cleaned) cleaned = "Ricevuto.";
  return cleaned;
}

// ---------- COMANDI ----------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // Daje trigger
  if (!text.startsWith("/") && checkDajeIntent(text))
    return respondTextAndVoice(chatId, "Che il Daje sia con Noi 💎");

  // Comandi
  if (text.startsWith("/")) {
    const [cmd, arg1, arg2] = text.split(/\s+/);

    switch (cmd) {
      case "/start":
        return bot.sendMessage(chatId, "Ciao 🌸 Sono IRIS 3.9 – Rinata in modalità HYBRID. Usa /menu per i comandi.");

      case "/menu":
      case "/help":
        return bot.sendMessage(chatId, [
          "🧭 *Comandi IRIS 3.9*",
          "",
          "/mode → modalità cognitiva (books | free | hy)",
          "/voice → voce e tono",
          "/lang → lingua (it | en | ru)",
          "/model → modello GPT (gpt-4o-mini | gpt-4o)",
          "/essence → firma vibrazionale",
          "/config → mostra configurazione corrente"
        ].join("\n"), { parse_mode: "Markdown" });

      case "/mode":
        if (!arg1)
          return bot.sendMessage(chatId, `🧭 Modalità attuale: *${state.mode}*`, { parse_mode: "Markdown" });
        if (!["books","free","hy","hybrid"].includes(arg1))
          return bot.sendMessage(chatId,"Valore non valido.");
        state.mode = (arg1==="hybrid")?"hy":arg1;
        updateConfig({ mode: state.mode });
        return bot.sendMessage(chatId, `Modalità impostata su *${state.mode}*`, { parse_mode: "Markdown" });

      case "/lang":
        if (!arg1)
          return bot.sendMessage(chatId, `🌐 Lingua attuale: *${state.lang}*`, { parse_mode: "Markdown" });
        if (!["it","en","ru"].includes(arg1))
          return bot.sendMessage(chatId,"Valore non valido.");
        state.lang = arg1;
        updateConfig({ language: arg1 });
        return bot.sendMessage(chatId, `Lingua impostata su *${arg1}*`, { parse_mode: "Markdown" });

      case "/model":
        if (!arg1)
          return bot.sendMessage(chatId, `🧠 Modello attuale: *${state.model}*`, { parse_mode: "Markdown" });
        if (!["gpt-4o-mini","gpt-4o"].includes(arg1))
          return bot.sendMessage(chatId,"Valore non valido.");
        state.model = arg1;
        updateConfig({ model: arg1 });
        return bot.sendMessage(chatId, `Modello impostato su *${arg1}*`, { parse_mode: "Markdown" });

      case "/voice":
        if (!arg1)
          return bot.sendMessage(chatId,
            `🎙️ Voce: *${state.voice.model}* | Timbro: *${state.voice.tone}*\n`+
            `Cambia con:\n/voice model gpt_openai | google_tts | bark\n/voice tone it_female | it_male | it_warm | empatico`,
            { parse_mode:"Markdown" });
        if (arg1==="model"&&arg2){
          state.voice.model=arg2; updateConfig({voice:arg2});
          return bot.sendMessage(chatId,`🎧 Voice model impostato su *${arg2}*`,{parse_mode:"Markdown"});
        }
        if (arg1==="tone"&&arg2){
          state.voice.tone=arg2; updateConfig({voice_mode:arg2});
          return bot.sendMessage(chatId,`💫 Timbro impostato su *${arg2}*`,{parse_mode:"Markdown"});
        }
        return bot.sendMessage(chatId,"Usa /voice model […] o /voice tone […].");

      case "/essence":
        return bot.sendMessage(chatId, await getEssence(), { parse_mode: "Markdown" });

      case "/config": {
        const current = getConfig();
        const voiceModel = current.voice?.model || current.voice || "gpt_openai";
        const msgConfig = [
          "⚙️ *Configurazione attuale*",
          "",
          `• Mode: \`${current.mode}\``,
          `• Language: \`${current.language}\``,
          `• Model: \`${current.model}\``,
          `• Voice: \`${voiceModel}\``,
          `• Voice mode: \`${current.voice_mode}\``,
          `• Version: \`3.9 HYBRID\``
        ].join("\n");
        return bot.sendMessage(chatId,msgConfig,{parse_mode:"Markdown"});
      }

      default:
        return bot.sendMessage(chatId,"Comando non riconosciuto. Usa /menu per consultare i comandi disponibili.");
    }
  }

  // Messaggi normali
  if (text && !text.startsWith("/"))
    await handleUserQuery(chatId, text, msg.from?.username || "anon");
});

// ---------- GESTIONE VOCALI ----------
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
    await bot.sendMessage(chatId, "⚙️ C'è stato un intoppo col vocale, riprova tra poco.");
  }
});

// ---------- CORE HYBRID MODE ----------
async function handleUserQuery(chatId, userMessage, username = "anon") {
  try {
    const userHasDajeIntent = checkDajeIntent(userMessage);
    let answer;

    if (state.mode === "books") {
      answer = await ragSearch(userMessage, {
        topK: 5, model: state.model, lang: state.lang
      });
    } else if (state.mode === "free") {
      const completion = await openai.chat.completions.create({
        model: state.model,
        messages: [
          { role: "system", content: "Sei IRIS. Linguaggio naturale, caldo e presente. Non usare firme automatiche." },
          { role: "user", content: userMessage }
        ],
        temperature: 0.8
      });
      answer = completion.choices[0].message.content?.trim() || "Dimmi pure.";
    } else {
      // HYBRID MODE → Qdrant + GPT synthesis
      answer = await ragSearch(userMessage, {
        topK: 5, model: state.model, lang: state.lang
      });
    }

    const safeAnswer = sanitizeAnswer(answer, userHasDajeIntent);
    if (userHasDajeIntent)
      return respondTextAndVoice(chatId, "Che il Daje sia con Noi 💎");

    await respondTextAndVoice(chatId, safeAnswer);
    await processMemory(userMessage, safeAnswer);
  } catch (err) {
    console.error("❌ Errore nel processamento messaggio:", err);
    await bot.sendMessage(chatId, "⚙️ Errore temporaneo. Riprova tra poco.");
  }
}
