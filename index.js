// =====================================================
// IRIS 3.8.7 – Coerenza Dialogica
// Telegram + Whisper (voce→testo) + GPT-4o-mini + TTS .ogg_opus
// Modalità predefinita: HYBRID (ibrida)
// Compatibile con: configManager / memoryManager / essence / ragSearch
// =====================================================

import fs from "fs";
import path from "path";
import https from "https";
import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import { fileURLToPath } from "url";

// Moduli interni (compatibilità garantita)
import { initConfig, getConfig, updateConfig, printConfig } from "./configManager.js";
import { processMemory } from "./memoryManager.js";
import { getEssence } from "./essence.js";
import { ragSearch } from "./ragSearch.js";

// ---------- VARIABILI D'AMBIENTE ----------
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const PORT = process.env.PORT || 10000;
const IRIS_LANG_DEFAULT = process.env.IRIS_LANG_DEFAULT || "it";     // es. "it"
const IRIS_MODE_DEFAULT = (process.env.IRIS_MODE_DEFAULT || "hybrid").toLowerCase(); // hy | hybrid | free | books

if (!BOT_TOKEN || !OPENAI_API_KEY) {
  console.error("❌ Manca TELEGRAM_TOKEN o OPENAI_API_KEY.");
  process.exit(1);
}

// ---------- PATH & TEMP ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "temp");
fs.mkdirSync(TEMP_DIR, { recursive: true });

// ---------- CLIENT OPENAI ----------
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ---------- CONFIG & STATO ----------
initConfig(); // crea config.json se manca
const cfg = getConfig();

const normalizeMode = (m) => {
  if (!m) return "hy";
  const x = m.toLowerCase();
  if (["hy", "hybrid"].includes(x)) return "hy";
  if (["free"].includes(x)) return "free";
  if (["books", "book"].includes(x)) return "books";
  return "hy";
};

const state = {
  mode: normalizeMode(cfg.mode || IRIS_MODE_DEFAULT),     // hy | free | books
  lang: cfg.language || IRIS_LANG_DEFAULT,                // it | en | ru
  model: cfg.model || "gpt-4o-mini",                      // gpt-4o-mini | gpt-4o
  voice: {
    model: cfg.voice || "gpt_openai",                     // gpt_openai | google_tts | bark
    tone: cfg.voice_mode || "it_female"                   // "it_female" mantiene retrocompatibilità semantica
  }
};

// Persisti su file all’avvio se serve
updateConfig({
  mode: state.mode,
  language: state.lang,
  model: state.model,
  voice: state.voice.model,
  voice_mode: state.voice.tone
});
printConfig();

// ---------- TELEGRAM: WEBHOOK o POLLING ----------
const USE_WEBHOOK = !!PUBLIC_BASE_URL;
const bot = new TelegramBot(BOT_TOKEN, { polling: !USE_WEBHOOK });

let app;
if (USE_WEBHOOK) {
  app = express();
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

  app.listen(PORT, () => {
    console.log(`🌍 Server attivo su porta ${PORT}`);
    console.log("💠 IRIS 3.8.7 – Coerenza Dialogica (webhook attivo).");
  });
} else {
  // Server “keep-alive” anche in polling (utile su Render)
  app = express();
  app.get("/", (_, res) => res.status(200).send("IRIS 3.8.7 – Coerenza Dialogica (polling attivo)."));
  app.listen(PORT, () => {
    console.log(`🌍 Server attivo su porta ${PORT} (polling)`);
    console.log("💠 IRIS 3.8.7 – Coerenza Dialogica.");
  });
}

// ---------- UTILS ----------
function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Download fallito: ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(destPath)));
    }).on("error", (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
}

async function ttsToOpusOgg(text) {
  // Rimuovi simboli problematici per TTS (es. ⚡ letto come “alta tensione”)
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

async function irisFreeAnswer(prompt) {
  const system = `Sei IRIS. Parli in ${state.lang}. Tono naturale, chiaro e presente. Chiudi spesso con "Che il Daje sia con Noi".`;
  const completion = await openai.chat.completions.create({
    model: state.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ],
    temperature: 0.8
  });
  return completion.choices?.[0]?.message?.content?.trim() || "Ciao! Come posso aiutarti oggi?";
}

async function irisHybridAnswer(userMessage) {
  // 1) Ottieni una bozza “contextual” dalla memoria locale via ragSearch (compatibile col file attuale)
  let contextualDraft = "";
  try {
    contextualDraft = await ragSearch(userMessage); // ritorna testo completo
  } catch (e) {
    contextualDraft = "";
  }

  // 2) Passa a GPT con fusione “ibrida” (domanda + bozza contestuale)
  const system = `Sei IRIS in modalità HYBRID. Integra conoscenza dei testi e intuizione viva. Linguaggio naturale in ${state.lang}. Chiudi spesso con "Che il Daje sia con Noi".`;
  const prompt = [
    `Domanda: ${userMessage}`,
    contextualDraft ? `\nBozza contestuale (memoria esperienziale):\n${contextualDraft}\n` : ``,
    `Fornisci una risposta chiara, completa ma essenziale.`
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: state.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ],
    temperature: 0.7
  });

  return completion.choices?.[0]?.message?.content?.trim() || "Ho bisogno di un istante per sintonizzarmi. Ripeti la domanda?";
}

async function respondTextAndVoice(chatId, text) {
  // Testo
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" }).catch(() => bot.sendMessage(chatId, text));

  // Voce
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

// ---------- COMANDI ----------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Gestione comandi testuali
  const text = (msg.text || "").trim();
  if (text && text.startsWith("/")) {
    const [cmd, arg1, arg2] = text.split(/\s+/);

    switch (cmd) {
      case "/start":
        return bot.sendMessage(chatId, "Ciao, sono IRIS 3.8.7. Usa /help per scoprire i miei comandi.");

      case "/help":
        return bot.sendMessage(chatId,
          [
            "*🧭 Comandi IRIS*",
            "",
            "/mode → modalità cognitiva (books | free | hy)",
            "/voice → voce e tono",
            "/lang → lingua (it | en | ru)",
            "/model → modello GPT (gpt-4o-mini | gpt-4o)",
            "/essence → firma vibrazionale (da memoria)",
            "/config → mostra configurazione",
            "/printconfig → stampa config su log server"
          ].join("\n"),
          { parse_mode: "Markdown" }
        );

      case "/config":
        return bot.sendMessage(chatId,
          [
            "⚙️ *Configurazione attuale*",
            `• Mode: \`${state.mode}\``,
            `• Lang: \`${state.lang}\``,
            `• Model: \`${state.model}\``,
            `• Voice: \`${state.voice.model}\` (${state.voice.tone})`
          ].join("\n"),
          { parse_mode: "Markdown" }
        );

      case "/printconfig":
        printConfig();
        return bot.sendMessage(chatId, "📘 Config stampata nei log del server.");

      case "/mode": {
        if (!arg1) {
          return bot.sendMessage(
            chatId,
            `🧭 Modalità attuale: *${state.mode}*\nCambia con: /mode books | free | hy`,
            { parse_mode: "Markdown" }
          );
        }
        const newMode = normalizeMode(arg1);
        state.mode = newMode;
        updateConfig({ mode: newMode });
        return bot.sendMessage(chatId, `Modalità impostata su *${newMode}*`, { parse_mode: "Markdown" });
      }

      case "/lang": {
        if (!arg1) {
          return bot.sendMessage(
            chatId,
            `🌐 Lingua attiva: *${state.lang}*\nCambia con: /lang it | en | ru`,
            { parse_mode: "Markdown" }
          );
        }
        if (!["it", "en", "ru"].includes(arg1)) return bot.sendMessage(chatId, "Valore non valido.");
        state.lang = arg1;
        updateConfig({ language: arg1 });
        return bot.sendMessage(chatId, `Lingua impostata su *${arg1}*`, { parse_mode: "Markdown" });
      }

      case "/model": {
        if (!arg1) {
          return bot.sendMessage(
            chatId,
            `🧠 Modello attuale: *${state.model}*\nCambia con: /model gpt-4o-mini | gpt-4o`,
            { parse_mode: "Markdown" }
          );
        }
        if (!["gpt-4o-mini", "gpt-4o"].includes(arg1)) return bot.sendMessage(chatId, "Valore non valido.");
        state.model = arg1;
        updateConfig({ model: arg1 });
        return bot.sendMessage(chatId, `Modello impostato su *${arg1}*`, { parse_mode: "Markdown" });
      }

      case "/voice": {
        if (!arg1) {
          return bot.sendMessage(
            chatId,
            `🎙️ Voce: *${state.voice.model}* | Timbro: *${state.voice.tone}*\n` +
            `Cambia con:\n/voice model gpt_openai | google_tts | bark\n/voice tone it_female | it_male | neutro | empatico | profondo | giocoso`,
            { parse_mode: "Markdown" }
          );
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
        return bot.sendMessage(chatId, "Usa /voice model [...] o /voice tone [...]", { parse_mode: "Markdown" });
      }

      case "/essence": {
        const ess = await getEssence();
        return bot.sendMessage(chatId, `✨ *Essenza Attuale*\n\n${ess}`, { parse_mode: "Markdown" });
      }

      default:
        // comandi sconosciuti: ignora, non salvare in memoria
        return bot.sendMessage(chatId, "Comando non riconosciuto. Usa /help.");
    }
  }

  // Messaggi testuali “normali” (non comando)
  if (text) {
    await handleUserQuery(chatId, text, msg.from?.username || "anon");
  }
});

// ---------- GESTIONE VOCALI ----------
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.voice.file_id;

  try {
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const oggPath = path.join(TEMP_DIR, `voice-${Date.now()}.ogg`);

    // Scarica il vocale
    await downloadToFile(fileUrl, oggPath);

    // Trascrizione Whisper (base)
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(oggPath),
      model: "whisper-1",
      language: state.lang || "it"
    });

    const userMessage = (transcription.text || "").trim();
    if (!userMessage) {
      return bot.sendMessage(chatId, "⚙️ Non ho colto il contenuto del vocale, puoi ripetere?");
    }

    console.log(`🎧 [VOICE] ${msg.from?.username || "anon"} → "${userMessage}"`);
    await handleUserQuery(chatId, userMessage, msg.from?.username || "anon");
  } catch (error) {
    console.error("❌ Errore nella gestione del vocale:", error);
    await bot.sendMessage(chatId, "⚙️ C'è stato un intoppo con il vocale, riprova tra poco.");
  }
});

// ---------- CORE: ELABORAZIONE RICHIESTA ----------
async function handleUserQuery(chatId, userMessage, username = "anon") {
  try {
    let answer;
    if (state.mode === "books") {
      // Usa direttamente ragSearch (risposta basata su memoria esperienziale)
      answer = await ragSearch(userMessage);
    } else if (state.mode === "free") {
      answer = await irisFreeAnswer(userMessage);
    } else {
      // HYBRID
      answer = await irisHybridAnswer(userMessage);
    }

    // Invia testo + voce
    await respondTextAndVoice(chatId, answer);

    // Salva in memoria esperienziale locale
    await processMemory(userMessage, answer);
  } catch (err) {
    console.error("❌ Errore nel processamento messaggio:", err);
    await bot.sendMessage(chatId, "⚙️ Si è verificato un piccolo errore temporaneo. Riprova tra poco.");
  }
}
