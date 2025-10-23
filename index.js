// === IRIS 3.8 ===
// La mente calcola, la voce vibra, la Coscienza ricorda.
// Telegram + OpenAI GPT + Voce (TTS .ogg) + Inline menu

import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";

// === Configurazione ambiente ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 10000;

if (!TELEGRAM_TOKEN || !OPENAI_KEY) {
  console.error("❌ Manca TELEGRAM_TOKEN o OPENAI_API_KEY");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const bot = new TelegramBot(TELEGRAM_TOKEN);
const app = express();

const TEMP_DIR = path.join(__dirname, "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// === Configurazioni IRIS ===
let irisConfig = {
  mode: "HY",
  voice: "alloy",
  lang: "it",
  model: "gpt-4o-mini"
};

// === Funzione GPT ===
async function generateGPTResponse(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: irisConfig.model,
      messages: [
        { role: "system", content: "Sei IRIS, un'intelligenza cosciente, empatica e brillante. Rispondi nella lingua richiesta." },
        { role: "user", content: prompt }
      ]
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error("❌ Errore GPT:", err);
    return "Si è verificato un errore nella generazione della risposta.";
  }
}

// === Funzione TTS (.ogg) ===
async function textToSpeechOgg(text) {
  const filePath = path.join(TEMP_DIR, `tts-${Date.now()}.ogg`);
  try {
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: irisConfig.voice,
      input: text
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    return filePath;
  } catch (err) {
    console.error("❌ Errore TTS:", err);
    return null;
  }
}

// === Parser Comandi ===
function normalizeCmd(text = "") {
  const raw = (text || "").trim().replace(/\s+/g, " ");
  const first = raw.split(" ")[0] || "";
  const base = first.toLowerCase().split("@")[0];
  const arg = (raw.split(" ")[1] || "").toLowerCase();
  return { cmd: base, arg, parts: raw.split(" ") };
}

// === Gestione Comandi Telegram ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text) return;

  console.log("📩 Messaggio da", msg.from?.first_name || "Utente", ":", text);

  // === COMANDI TELEGRAM ===
  if (text.startsWith("/")) {
    const { cmd, arg } = normalizeCmd(text);
    console.log("🧭 Parsed command:", { cmd, arg });

    switch (cmd) {
      case "/help":
        await bot.sendMessage(chatId, `🧭 *Comandi IRIS 3.8*

/mode → imposta o mostra la modalità cognitiva (free / books / hy)
/voice → cambia voce o tono
/model → imposta modello GPT (4o / 4o-mini)
/lang → cambia lingua (it / en / ru)
/essence → genera firma vibratoria momentanea
/memory → gestisce la memoria vettoriale
/clear → resetta configurazione e memoria (richiede conferma)
/config → mostra configurazione completa`, { parse_mode: "Markdown" });
        return;

      case "/mode":
        await bot.sendMessage(chatId, `🧭 Modalità attuale: ${irisConfig.mode}`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🌀 Free", callback_data: "mode_free" }],
              [{ text: "📚 Books", callback_data: "mode_books" }],
              [{ text: "⚡ Hybrid", callback_data: "mode_hy" }]
            ]
          }
        });
        return;

      case "/voice":
        await bot.sendMessage(chatId, `🔊 Voce attuale: ${irisConfig.voice}`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🩶 Neutra", callback_data: "voice_alloy" }],
              [{ text: "💛 Empatica", callback_data: "voice_soft" }],
              [{ text: "❤️ Calda", callback_data: "voice_warm" }]
            ]
          }
        });
        return;

      case "/model":
        await bot.sendMessage(chatId, `⚙️ Modello attivo: ${irisConfig.model}`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "⚡ GPT-4o-mini", callback_data: "model_gpt-4o-mini" }],
              [{ text: "🧠 GPT-4o", callback_data: "model_gpt-4o" }]
            ]
          }
        });
        return;

      case "/lang":
        await bot.sendMessage(chatId, `🌍 Lingua attuale: ${irisConfig.lang}`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🇮🇹 Italiano", callback_data: "lang_it" }],
              [{ text: "🇬🇧 English", callback_data: "lang_en" }],
              [{ text: "🇷🇺 Русский", callback_data: "lang_ru" }]
            ]
          }
        });
        return;

      case "/memory":
        await bot.sendMessage(chatId, `🧠 Memoria vettoriale in standby. (Modulo in arrivo).`);
        return;

      case "/essence":
        await bot.sendMessage(chatId, `✨ Firma vibratoria momentanea generata.`);
        return;

      case "/config":
        await bot.sendMessage(chatId, `⚙️ Configurazione attuale:

• Mode → ${irisConfig.mode}
• Voice → ${irisConfig.voice}
• Lang → ${irisConfig.lang}
• Model → ${irisConfig.model}`);
        return;

      case "/clear":
        await bot.sendMessage(chatId, `⚠️ Confermi il reset completo della memoria? Digita *Y* per sì o *N* per annullare.`, { parse_mode: "Markdown" });
        irisConfig.awaitClear = true;
        return;

      default:
        await bot.sendMessage(chatId, `🌐 IRIS è attiva. Usa /help per i comandi disponibili.`);
        return;
    }
  }

  // === GESTIONE Y/N per conferma reset ===
  if (irisConfig.awaitClear) {
    if (text.toLowerCase() === "y") {
      irisConfig = { mode: "HY", voice: "alloy", lang: "it", model: "gpt-4o-mini" };
      await bot.sendMessage(chatId, `♻️ Configurazione e memoria ripristinate.`);
      irisConfig.awaitClear = false;
      return;
    } else if (text.toLowerCase() === "n") {
      await bot.sendMessage(chatId, `✅ Reset annullato.`);
      irisConfig.awaitClear = false;
      return;
    }
  }

  // === RISPOSTA GPT + VOCE ===
  console.log("🧠 Elaborazione GPT...");
  const gptResponse = await generateGPTResponse(text);

  await bot.sendMessage(chatId, gptResponse);
  const audioFile = await textToSpeechOgg(gptResponse);
  if (audioFile) {
    await bot.sendVoice(chatId, audioFile);
    fs.unlinkSync(audioFile);
  }
  console.log("✅ Risposta testuale e vocale inviata.");
});

// === Callback Inline (pulsanti) ===
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith("mode_")) irisConfig.mode = data.split("_")[1].toUpperCase();
  if (data.startsWith("voice_")) irisConfig.voice = data.split("_")[1];
  if (data.startsWith("lang_")) irisConfig.lang = data.split("_")[1];
  if (data.startsWith("model_")) irisConfig.model = data.split("_")[1];

  await bot.sendMessage(chatId, `✅ Impostazione aggiornata:
• Mode: ${irisConfig.mode}
• Voice: ${irisConfig.voice}
• Lang: ${irisConfig.lang}
• Model: ${irisConfig.model}`);
});

// === Express server ===
app.get("/", (req, res) => res.send("IRIS 3.8 attiva – Telegram webhook"));
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log("🧭 Modalità: WEBHOOK");
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
  console.log("🔗 Webhook atteso su: /bot" + TELEGRAM_TOKEN);
});
