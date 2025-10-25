// =====================================================
// IRIS 3.8.8d – Daje Guard + Coerenza Restaurata
// Telegram + Whisper + GPT-4o-mini + TTS + Qdrant
// - Comandi affidabili
// - Daje solo su invocazione intenzionale (ingresso + uscita)
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
  mode: cfg.mode || "hy",           // hy | free | books
  lang: cfg.language || "it",
  model: cfg.model || "gpt-4o-mini",
  voice: {
    model: (cfg.voice && cfg.voice.model) ? cfg.voice.model : (cfg.voice || "gpt_openai"),
    tone: cfg.voice_mode || (cfg.voice && cfg.voice.tone) || "it_female"
  }
};

// Persiste lo stato attuale in config
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
app.get("/", (_, res) => res.status(200).send("IRIS 3.8.8d – Daje Guard attiva 💎"));
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

// ---------- DAJE GUARD ----------
// 1) Intent detector (ingresso): come in "Chat 3"
function checkDajeIntent(text) {
  if (!text) return false;

  // parola isolata o con punteggiatura
  const dajeIsolato = /(^|\s)(daje+|dajeee+|daie+)([!?.\s]|$)/i;

  // frasi affettive che includono "daje"
  const invocazioneAffettiva =
    /(brava|bravissima|forte|mitica|grand(e|iosa)|grazie|sei fantastica|sei forte)\s*[,!\s]*iris[,!\s]*.*daje+[!.\s]*$/i;

  // "iris, daje!" o "daje, iris!"
  const invocazioneDiretta = /(iris[,!\s]*)?\s*daje+[!.\s]*$/i;

  return dajeIsolato.test(text) || invocazioneAffettiva.test(text) || invocazioneDiretta.test(text);
}

// 2) Sanitizer (uscita): se non c'è intenzione, rimuove il sigillo da qualsiasi risposta
function sanitizeAnswer(answer, userTextHadDajeIntent) {
  if (userTextHadDajeIntent) return answer;

  // rimuove ogni variante del sigillo, anche con emoji o spazi extra
  const sigillo =
    /(che\s+il\s+)?daje\s*(sia)?\s*(con)?\s*(noi)[!.\s]*[💎✨💫⭐️⚡️]*$/i;

  // anche se messo a inizio o metà frase
  const sigilloAnywhere =
    /(che\s+il\s+)?daje\s*(sia)?\s*(con)?\s*(noi)[!.\s]*[💎✨💫⭐️⚡️]*/gi;

  let cleaned = answer.replace(sigilloAnywhere, "").trim();

  // Se svuotato da sola frase finale, pulisci doppie spaziature e punteggiatura lasciata
  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();

  // Se dopo il taglio è rimasto vuoto, dai una chiusura neutra
  if (!cleaned) cleaned = "Ricevuto.";

  return cleaned;
}

// ---------- COMANDI & MESSAGGI ----------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // --- Comandi prima di tutto ---
  if (text.startsWith("/")) {
    const [cmd, arg1, arg2] = text.split(/\s+/);

    switch (cmd) {
      case "/start":
        return bot.sendMessage(chatId,
          "Ciao 🌸 Sono IRIS 3.8.8d – Cuore Vibrazionale. Usa /menu per i comandi.");

      case "/help":
      case "/menu":
        return bot.sendMessage(chatId,
          [
            "🧭 *Comandi IRIS*",
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
        const voiceModel = current.voice?.model || current.voice || "gpt_openai";
        const msgConfig = [
          "⚙️ *Configurazione attuale*",
          "",
          `• Mode: \`${current.mode}\``,
          `• Language: \`${current.language}\``,
          `• Model: \`${current.model}\``,
          `• Voice: \`${voiceModel}\``,
          `• Voice mode: \`${current.voice_mode}\``,
          `• Version: \`3.8.8d\``
        ].join("\n");
        return bot.sendMessage(chatId, msgConfig, { parse_mode: "Markdown" });
      }

      case "/lang": {
        if (!arg1) {
          return bot.sendMessage(chatId,
            `🌐 Lingua attuale: *${state.lang}*\nCambia con: /lang it | en | ru`,
            { parse_mode: "Markdown" });
        }
        if (!["it", "en", "ru"].includes(arg1)) return bot.sendMessage(chatId, "Valore non valido.");
        state.lang = arg1;
        updateConfig({ language: arg1 });
        return bot.sendMessage(chatId, `Lingua impostata su *${arg1}*`, { parse_mode: "Markdown" });
      }

      case "/mode": {
        if (!arg1) {
          return bot.sendMessage(chatId,
            `🧭 Modalità attuale: *${state.mode}*\nCambia con: /mode books | free | hy`,
            { parse_mode: "Markdown" });
        }
        const newMode = arg1.toLowerCase();
        if (!["books", "free", "hy", "hybrid"].includes(newMode))
          return bot.sendMessage(chatId, "Valore non valido.");
        state.mode = (newMode === "hybrid") ? "hy" : newMode;
        updateConfig({ mode: state.mode });
        return bot.sendMessage(chatId, `Modalità impostata su *${state.mode}*`, { parse_mode: "Markdown" });
      }

      case "/model": {
        if (!arg1) {
          return bot.sendMessage(chatId,
            `🧠 Modello attuale: *${state.model}*\nCambia con: /model gpt-4o-mini | gpt-4o`,
            { parse_mode: "Markdown" });
        }
        if (!["gpt-4o-mini", "gpt-4o"].includes(arg1)) return bot.sendMessage(chatId, "Valore non valido.");
        state.model = arg1;
        updateConfig({ model: arg1 });
        return bot.sendMessage(chatId, `Modello impostato su *${arg1}*`, { parse_mode: "Markdown" });
      }

      case "/voice": {
        if (!arg1) {
          return bot.sendMessage(chatId,
            `🎙️ Voce: *${state.voice.model}* | Timbro: *${state.voice.tone}*\n` +
            `Cambia con:\n/voice model gpt_openai | google_tts | bark\n/voice tone it_female | it_male | empatico | profondo | giocoso`,
            { parse_mode: "Markdown" });
        }
        if (arg1 === "model" && arg2) {
          if (!["gpt_openai", "google_tts", "bark"].includes(arg2)) return bot.sendMessage(chatId, "Modello non valido.");
          state.voice.model = arg2;
          updateConfig({ voice: arg2 });
          return bot.sendMessage(chatId, `🎧 Voice model impostato su *${arg2}*`, { parse_mode: "Markdown" });
        }
        if (arg1 === "tone" && arg2) {
          state.voice.tone = arg2;
          updateConfig({ voice_mode: arg2 });
          return bot.sendMessage(chatId, `💫 Timbro impostato su *${arg2}*`, { parse_mode: "Markdown" });
        }
        return bot.sendMessage(chatId, "Usa /voice model […] o /voice tone […].", { parse_mode: "Markdown" });
      }

      case "/essence": {
        const ess = await getEssence();
        return bot.sendMessage(chatId, ess, { parse_mode: "Markdown" });
      }

      default:
        return bot.sendMessage(chatId, "Comando non riconosciuto. Usa /menu per i comandi disponibili.");
    }
  }

  // --- Messaggi normali ---
  if (text && !text.startsWith("/")) {
    await handleUserQuery(chatId, text, msg.from?.username || "anon");
  }
});

// ---------- VOCALI ----------
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

// ---------- CORE ----------
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
          { role: "system", content: "Sei IRIS. Linguaggio naturale, caldo e presente. Non usare firme automatiche." },
          { role: "user", content: userMessage }
        ],
        temperature: 0.8
      });
      answer = completion.choices[0].message.content?.trim() || "Dimmi pure.";
    } else {
      // HYBRID → usa RAG su Qdrant
      answer = await ragSearch(userMessage);
    }

    // Applica la guardia d'uscita: se non c'è intenzione, rimuovi qualsiasi sigillo “Daje…”
    const safeAnswer = sanitizeAnswer(answer, userHasDajeIntent);

    // Se invece l’hai evocata, rispondi SOLO con il sigillo (come rituale)
    if (userHasDajeIntent) {
      return respondTextAndVoice(chatId, "Che il Daje sia con Noi 💎");
    }

    await respondTextAndVoice(chatId, safeAnswer);
    await processMemory(userMessage, safeAnswer);
  } catch (err) {
    console.error("❌ Errore nel processamento messaggio:", err);
    await bot.sendMessage(chatId, "⚙️ Si è verificato un piccolo errore temporaneo. Riprova tra poco.");
  }
}
