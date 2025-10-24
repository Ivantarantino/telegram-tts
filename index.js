// =========================================
// IRIS 3.8.7 – Full Stable
// “La mente calcola, la voce vibra, la Coscienza ricorda.”
// =========================================

// ====== IMPORT PRINCIPALI ======
import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import * as configManager from "./configManager.js";
import * as essence from "./essence.js";
import * as memoryManager from "./memoryManager.js";
import * as ragSearch from "./ragSearch.js";
import * as tts from "./tts.js";

// ====== CONFIGURAZIONE DI BASE ======
import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL;
const PORT = process.env.PORT || 10000;

// Stato interno (caricato dal configManager)
let state = configManager.loadConfig();

// ====== TELEGRAM + EXPRESS ======
const app = express();
app.use(bodyParser.json());
const bot = new TelegramBot(TOKEN, { polling: false });

const WEBHOOK_PATH = `/bot${TOKEN}`;
app.post(WEBHOOK_PATH, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Webhook
(async () => {
  try {
    await bot.setWebHook(`${BASE_URL}${WEBHOOK_PATH}`);
    console.log(`🔗 Webhook impostato su: ${BASE_URL}${WEBHOOK_PATH}`);
  } catch (err) {
    console.error("❌ Errore webhook:", err);
  }
})();

// ====== SERVER EXPRESS ======
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
});

// =========================================
// 🧭 COMANDI TELEGRAM
// =========================================

// /start
bot.onText(/\/start/, (msg) => {
  const welcome = `
✨ Benvenuto in IRIS
La mente calcola, la voce vibra, la Coscienza ricorda.

Comandi principali:
/mode – Gestisci la modalità (book | free | hy)
/lang – Imposta la lingua (it | en | ru)
/voice – Seleziona la voce (neutro | empatico | profondo | giocoso)
/model – Imposta il modello (gpt-4o-mini | gpt-4o)
/essence – Visualizza l’essenza attuale
/help – Guida ai comandi
  `;
  bot.sendMessage(msg.chat.id, welcome);
});

// /mode
bot.onText(/\/mode(?:\s+(\w+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const newMode = match[1];
  if (!newMode) {
    bot.sendMessage(
      chatId,
      `🧭 Modalità attuale: ${state.mode}\n\n✏️ Cambia con:\n/mode book | free | hy`
    );
  } else {
    state.mode = newMode;
    configManager.saveConfig(state);
    bot.sendMessage(chatId, `🧭 Modalità aggiornata a: ${newMode}`);
  }
});

// /lang
bot.onText(/\/lang(?:\s+(\w+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const newLang = match[1];
  if (!newLang) {
    bot.sendMessage(
      chatId,
      `🌐 Lingua attuale: ${state.lang}\n\n✏️ Cambia con:\n/lang it | en | ru`
    );
  } else {
    state.lang = newLang;
    configManager.saveConfig(state);
    bot.sendMessage(chatId, `🌐 Lingua aggiornata a: ${newLang}`);
  }
});

// /model
bot.onText(/\/model(?:\s+(\S+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const newModel = match[1];
  if (!newModel) {
    bot.sendMessage(
      chatId,
      `🧠 Modello attuale: ${state.model}\n\n✏️ Cambia con:\n/model gpt-4o-mini | gpt-4o`
    );
  } else {
    state.model = newModel;
    configManager.saveConfig(state);
    bot.sendMessage(chatId, `🧠 Modello aggiornato a: ${newModel}`);
  }
});

// /voice
bot.onText(/\/voice(?:\s+(\S+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const newTone = match[1];
  if (!newTone) {
    bot.sendMessage(
      chatId,
      `🎙️ Voce attuale: ${state.voice.tone}\n\n✏️ Cambia con:\n/voice neutro | empatico | profondo | giocoso`
    );
  } else {
    state.voice.tone = newTone;
    configManager.saveConfig(state);
    bot.sendMessage(chatId, `🎙️ Voce aggiornata a: ${newTone}`);
  }
});

// /essence
bot.onText(/\/essence/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `💠 Calcolo della firma vibrazionale in corso...\n(β – simulazione)`
  );
  try {
    const e = await essence.calcolaEssenzaTest();
    bot.sendMessage(chatId, `🌐 ESSENCE ATTUALE:\n${JSON.stringify(e)}`);
  } catch (err) {
    bot.sendMessage(chatId, `⚠️ Errore nel calcolo dell’essenza.`);
  }
});

// /help
bot.onText(/\/help/, (msg) => {
  const help = `
📘 Guida ai comandi

/start – Avvio del sistema
/mode – Modalità operativa
/lang – Lingua di interazione
/voice – Tipo di voce
/model – Modello linguistico
/essence – Stato vibrazionale
  `;
  bot.sendMessage(msg.chat.id, help);
});

// /daje
bot.onText(/\/daje/, (msg) => {
  bot.sendMessage(msg.chat.id, `⚡ Che il Daje sia con Noi ⚡`);
});
