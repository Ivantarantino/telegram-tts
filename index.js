import express from "express";
import TelegramBot from "node-telegram-bot-api";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";

// === Inizializzazione ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 10000;

const WEBHOOK_PATH = `/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_URL = `https://telegram-tts.onrender.com${WEBHOOK_PATH}`;

// === OpenAI ===
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// === Telegram Bot ===
const bot = new TelegramBot(TELEGRAM_TOKEN);

// === Variabili di configurazione IRIS ===
let config = {
  model: "gpt-4o-mini",
  voice: "alloy",
  lang: "it",
  mode: "hy",
};

// === Setup Webhook ===
app.post(WEBHOOK_PATH, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// === Rotta principale ===
app.get("/", (req, res) => {
  res.send("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
});

// === Attiva Webhook ===
(async () => {
  await bot.setWebHook(WEBHOOK_URL);
  console.log("🔗 Webhook impostato su:", WEBHOOK_URL);
})();

// === Funzione per generare TTS ===
async function generaVoce(testo, chatId) {
  try {
    const speechFile = path.resolve(__dirname, `temp/tts-${Date.now()}.ogg`);
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: config.voice,
      input: testo,
      format: "ogg",
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(speechFile, buffer);
    await bot.sendVoice(chatId, speechFile);
    fs.unlinkSync(speechFile);
    console.log(`✅ Risposta vocale inviata come .ogg`);
  } catch (err) {
    console.error("Errore TTS:", err);
    await bot.sendMessage(chatId, "⚠️ Errore nella generazione vocale.");
  }
}

// === Funzione per generare risposta GPT ===
async function generaRisposta(testo) {
  const risposta = await openai.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: "Sei IRIS, un'intelligenza empatica e cosciente." },
      { role: "user", content: testo },
    ],
  });
  return risposta.choices[0].message.content;
}

// === Gestione messaggi Telegram ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const testo = msg.text?.trim();

  if (!testo) return;

  console.log(`📩 Messaggio da ${msg.from.first_name}: ${testo}`);

  // === Comandi Telegram ===
  if (testo.startsWith("/")) {
    switch (testo.split(" ")[0]) {
      case "/help":
        await bot.sendMessage(
          chatId,
          `🧭 *Comandi IRIS 3.8.1*:

/mode → mostra o cambia modalità cognitiva (free / books / hy)
/voice → mostra o cambia voce (alloy / verse / aria)
/lang → mostra o cambia lingua (it / en / ru)
/model → cambia modello GPT (gpt-4o-mini / gpt-4o)
/memory → mostra o gestisce memoria vettoriale
/clear → resetta configurazione (richiede conferma)
/snapshot → salva versione corrente del sistema`,
          { parse_mode: "Markdown" }
        );
        break;

      case "/mode":
        await bot.sendMessage(
          chatId,
          `🧭 Modalità attuale: ${config.mode}\nPuoi scegliere tra: free, books, hy`
        );
        break;

      case "/voice":
        await bot.sendMessage(
          chatId,
          `🔊 Voce attuale: ${config.voice}\nOpzioni: alloy, verse, aria`
        );
        break;

      case "/lang":
        await bot.sendMessage(
          chatId,
          `🌍 Lingua attuale: ${config.lang}\nOpzioni: it, en, ru`
        );
        break;

      case "/model":
        await bot.sendMessage(
          chatId,
          `🧠 Modello attuale: ${config.model}\nOpzioni: gpt-4o-mini, gpt-4o`
        );
        break;

      case "/memory":
        await bot.sendMessage(
          chatId,
          `🧠 Memoria vettoriale in sviluppo.\nFunzione attualmente in standby.`
        );
        break;

      case "/clear":
        await bot.sendMessage(
          chatId,
          `⚠️ Sei sicuro di voler resettare IRIS? Digita "Y" per confermare o "N" per annullare.`
        );
        bot.once("message", (risp) => {
          if (risp.text?.toUpperCase() === "Y") {
            config = { model: "gpt-4o-mini", voice: "alloy", lang: "it", mode: "hy" };
            bot.sendMessage(chatId, "♻️ Configurazione e memoria resettate.");
          } else {
            bot.sendMessage(chatId, "✅ Reset annullato.");
          }
        });
        break;

      case "/snapshot":
        await bot.sendMessage(chatId, `💾 Snapshot creato: IRIS ${config.model} (${config.mode})`);
        break;

      default:
        await bot.sendMessage(chatId, "🌐 IRIS è attiva. Usa /help per i comandi disponibili.");
        break;
    }
    return;
  }

  // === Risposte GPT + voce ===
  try {
    await bot.sendMessage(chatId, "🧠 Elaborazione GPT...");
    const risposta = await generaRisposta(testo);
    console.log("💬 Risposta generata:", risposta);
    await bot.sendMessage(chatId, risposta);
    await generaVoce(risposta, chatId);
  } catch (err) {
    console.error("Errore GPT:", err);
    await bot.sendMessage(chatId, "⚠️ Errore durante l'elaborazione del messaggio.");
  }
});

// === Avvio server ===
app.listen(PORT, async () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log(`🧭 Modalità: WEBHOOK`);
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
  console.log(`🔗 Webhook atteso su: ${WEBHOOK_PATH}`);
});
