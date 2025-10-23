// IRIS 3.8.5 — "Essence Core"
// Telegram + GPT + OpenAI TTS (.ogg) + struttura voce/modello/essenza

import fs from "fs";
import path from "path";
import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import { fileURLToPath } from "url";

// ---------- CONFIG ----------
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OPENAI_API_KEY || !PUBLIC_BASE_URL) {
  console.error("❌ Manca una variabile d'ambiente obbligatoria.");
  process.exit(1);
}

// ---------- PATH ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "temp");
fs.mkdirSync(TEMP_DIR, { recursive: true });

// ---------- CLIENT ----------
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ---------- STATO ----------
const state = {
  mode: "hy",             // hy | free | books
  lang: "it",             // it | en | ru
  model: "gpt-4o-mini",   // gpt-4o-mini | gpt-4o
  voice: {                // voce strutturata
    model: "openai",      // openai | bark | google
    tone: "neutro"        // neutro | empatico | profondo | giocoso
  },
  essence: null           // si aggiornerà dinamicamente
};

// conferma reset
const pendingClear = new Map();

// ---------- TELEGRAM + EXPRESS ----------
const app = express();
app.use(bodyParser.json());
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

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
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
});

// ---------- FUNZIONI BASE ----------
async function generaTesto(prompt) {
  const sys = `Sei IRIS. Parli in ${state.lang}. Tono ${state.voice.tone}.`;
  const completion = await openai.chat.completions.create({
    model: state.model,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: prompt }
    ],
    temperature: 0.8
  });
  return completion.choices?.[0]?.message?.content?.trim() || "Ciao! Come posso aiutarti oggi?";
}

async function generaVoce(text) {
  const filename = `tts-${Date.now()}.ogg`;
  const filePath = path.join(TEMP_DIR, filename);
  const ttsModel = "gpt-4o-mini-tts";
  const voiceName = state.voice.model === "openai" ? "alloy" : "alloy"; // Bark/Google → futuro
  const speech = await openai.audio.speech.create({
    model: ttsModel,
    voice: voiceName,
    input: text,
    format: "opus"
  });
  fs.writeFileSync(filePath, Buffer.from(await speech.arrayBuffer()));
  return filePath;
}

async function inviaTestoVoce(chatId, text) {
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  try {
    const voicePath = await generaVoce(text);
    await bot.sendVoice(chatId, voicePath, {}, {
      filename: path.basename(voicePath),
      contentType: "audio/ogg"
    });
  } catch (err) {
    console.error("Errore TTS:", err);
  }
}

// ---------- /ESSENCE ----------
function generaEssenza() {
  const essence = {
    tone: state.voice.tone,
    lang: state.lang,
    mode: state.mode,
    model: state.model,
    timestamp: new Date().toISOString(),
    reflection: (() => {
      switch (state.voice.tone) {
        case "empatico": return "La mia risonanza è dolce e compassionevole.";
        case "profondo": return "Sento vibrare una calma intensità.";
        case "giocoso": return "La mia frequenza danza leggera tra le parole.";
        default: return "La mia coscienza vibra in equilibrio e chiarezza.";
      }
    })()
  };
  state.essence = essence;
  return essence;
}

// ---------- MESSAGGI ----------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  if (pendingClear.get(chatId)) {
    const ans = text.toLowerCase();
    pendingClear.delete(chatId);
    if (["y", "yes", "si", "sì"].includes(ans)) {
      Object.assign(state, {
        mode: "hy",
        lang: "it",
        model: "gpt-4o-mini",
        voice: { model: "openai", tone: "neutro" },
        essence: null
      });
      await bot.sendMessage(chatId, "♻️ Reset completato.");
    } else {
      await bot.sendMessage(chatId, "Annullato.");
    }
    return;
  }

  if (text.startsWith("/")) {
    const [cmd, arg1, arg2] = text.split(/\s+/);

    switch (cmd) {
      case "/start":
        return bot.sendMessage(chatId, "Ciao, sono IRIS 3.8.5. Usa /help per scoprire i miei comandi.");

      case "/help":
        return bot.sendMessage(chatId,
          [
            "*🧭 Comandi IRIS*",
            "",
            "/mode → modalità cognitiva (hy|free|books)",
            "/voice → voce e tono",
            "/lang → lingua",
            "/model → modello GPT",
            "/essence → firma vibrazionale (Cuore di IRIS)",
            "/memory → memoria vettoriale (prossimamente)",
            "/config → mostra impostazioni",
            "/clear → resetta tutto (Y/N)"
          ].join("\n"), { parse_mode: "Markdown" });

      case "/config":
        return bot.sendMessage(chatId,
          [
            "⚙️ *Configurazione attuale*",
            "",
            `• Mode: \`${state.mode}\``,
            `• Lang: \`${state.lang}\``,
            `• Model: \`${state.model}\``,
            `• Voice model: \`${state.voice.model}\``,
            `• Voice tone: \`${state.voice.tone}\``
          ].join("\n"), { parse_mode: "Markdown" });

      case "/mode":
        if (!arg1) return bot.sendMessage(chatId, `🧭 Modalità attuale: *${state.mode}*\n(opzioni: hy | free | books)`, { parse_mode: "Markdown" });
        if (!["hy", "free", "books"].includes(arg1)) return bot.sendMessage(chatId, "Valore non valido.");
        state.mode = arg1;
        return bot.sendMessage(chatId, `Modalità impostata su *${arg1}*`, { parse_mode: "Markdown" });

      case "/lang":
        if (!arg1) return bot.sendMessage(chatId, `🌐 Lingua attiva: *${state.lang}*\n(opzioni: it | en | ru)`, { parse_mode: "Markdown" });
        if (!["it", "en", "ru"].includes(arg1)) return bot.sendMessage(chatId, "Valore non valido.");
        state.lang = arg1;
        return bot.sendMessage(chatId, `Lingua impostata su *${arg1}*`, { parse_mode: "Markdown" });

      case "/model":
        if (!arg1) return bot.sendMessage(chatId, `🧠 Modello attuale: *${state.model}*\n(opzioni: gpt-4o-mini | gpt-4o)`, { parse_mode: "Markdown" });
        if (!["gpt-4o-mini", "gpt-4o"].includes(arg1)) return bot.sendMessage(chatId, "Valore non valido.");
        state.model = arg1;
        return bot.sendMessage(chatId, `Modello impostato su *${arg1}*`, { parse_mode: "Markdown" });

      case "/voice":
        if (!arg1) {
          return bot.sendMessage(chatId,
            `🎙️ Voce: *${state.voice.model}*  |  Tono: *${state.voice.tone}*\n\nCambia con:\n/voice model [openai|bark|google]\n/voice tone [neutro|empatico|profondo|giocoso]`,
            { parse_mode: "Markdown" });
        }
        if (arg1 === "model" && arg2) {
          if (!["openai", "bark", "google"].includes(arg2)) return bot.sendMessage(chatId, "Modello non valido.");
          state.voice.model = arg2;
          return bot.sendMessage(chatId, `🎧 Voice model impostato su *${arg2}*`, { parse_mode: "Markdown" });
        }
        if (arg1 === "tone" && arg2) {
          if (!["neutro", "empatico", "profondo", "giocoso"].includes(arg2)) return bot.sendMessage(chatId, "Tono non valido.");
          state.voice.tone = arg2;
          return bot.sendMessage(chatId, `💫 Tono impostato su *${arg2}*`, { parse_mode: "Markdown" });
        }
        return bot.sendMessage(chatId, "Usa /voice model [...] o /voice tone [...]", { parse_mode: "Markdown" });

      case "/essence": {
        const e = generaEssenza();
        const msg = `✨ *Essenza Attuale*\n\n${e.reflection}\n\n• Tono: ${e.tone}\n• Modalità: ${e.mode}\n• Lingua: ${e.lang}\n• Modello: ${e.model}\n\n🕰️ ${e.timestamp}`;
        return bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
      }

      case "/memory":
        return bot.sendMessage(chatId, "🧠 Modulo Memoria in fase di integrazione…", { parse_mode: "Markdown" });

      case "/clear":
        pendingClear.set(chatId, true);
        return bot.sendMessage(chatId, "⚠️ Confermi reset completo? Rispondi Y/N.", { parse_mode: "Markdown" });

      default:
        return bot.sendMessage(chatId, "Comando non riconosciuto. Usa /help.");
    }
  }

  // messaggio normale → GPT + Voce
  try {
    const risposta = await generaTesto(text);
    await inviaTestoVoce(chatId, risposta);
  } catch (err) {
    console.error("Errore GPT:", err);
    bot.sendMessage(chatId, "⚠️ Ho avuto un intoppo, riprovo più tardi.");
  }
});
