// index_3.8.7.js
// ---------------------------------------------
// IRIS – Telegram TTS Bot – Versione 3.8.7
// "Coerenza Dialogica"
// Basato su 3.8.6_OK, con menù uniformati nello stile:
// 🧭 Parametro attuale: ...
// Cambia con: /comando valore
// ---------------------------------------------

import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { configManager } from './configManager.js';
import { memoryManager } from './memoryManager.js';
import { ragSearch } from './ragSearch.js';
import { essence } from './essence.js';
import { tts } from './tts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || configManager.get('telegram_token');
const PORT = process.env.PORT || 10000;

if (!TELEGRAM_TOKEN) {
  console.error('❌ Telegram Token non trovato. Verifica la variabile TELEGRAM_TOKEN o config.json.');
  process.exit(1);
}

console.log(`🔑 Telegram token: TROVATO ✅`);
console.log(`✅ Config inizializzata con TELEGRAM_TOKEN.`);

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const app = express();

app.use(express.json());
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log(`💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.`);
});

// -------------------------------------------------------------
// 🔹 Gestione Comandi Telegram
// -------------------------------------------------------------

bot.onText(/^\/start$/, (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from.first_name || "Utente";
  bot.sendMessage(chatId, `🌸 Benvenuto ${user}!\nIRIS è attiva e pronta al dialogo cosciente.\n\nUsa /help per scoprire i comandi disponibili.\nChe il Daje sia con Noi ⚡`);
});

// 🌐 Lingua
bot.onText(/^\/lang$/, (msg) => {
  const chatId = msg.chat.id;
  const lingua = configManager.get('lang');
  bot.sendMessage(chatId, `🌐 Lingua attiva: ${lingua}\nCambia con:\n/lang it | en | ru`);
});

// 🎙️ Voce
bot.onText(/^\/voice$/, (msg) => {
  const chatId = msg.chat.id;
  const voce = configManager.get('voice');
  bot.sendMessage(chatId, `🎙️ Voce attuale: ${voce}\nCambia con:\n/voice stella | lyra | nova`);
});

// 🧭 Modalità
bot.onText(/^\/mode$/, (msg) => {
  const chatId = msg.chat.id;
  const mode = configManager.get('mode');
  bot.sendMessage(chatId, `🧭 Modalità attuale: ${mode}\nCambia con:\n/mode book | free | hy`);
});

// 🧠 Modello
bot.onText(/^\/model$/, (msg) => {
  const chatId = msg.chat.id;
  const model = configManager.get('model');
  bot.sendMessage(chatId, `🧠 Modello attuale: ${model}\nCambia con:\n/model gpt-4o-mini | gpt-4o | gpt-3.5-turbo`);
});

// ⚖️ Pesi
bot.onText(/^\/weights$/, (msg) => {
  const chatId = msg.chat.id;
  const weights = configManager.get('weights');
  bot.sendMessage(chatId, `⚖️ Pesi attuali: ${weights}\nCambia con:\n/weights light | medium | full`);
});

// 🪶 Essence
bot.onText(/^\/essence$/, async (msg) => {
  const chatId = msg.chat.id;
  const e = await essence.calculate();
  bot.sendMessage(chatId, `💎 Essence attuale:\n${JSON.stringify(e, null, 2)}`);
});

// 💬 Help
bot.onText(/^\/help$/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `📜 Comandi disponibili:
🌐 /lang – imposta la lingua
🎙️ /voice – cambia la voce
🧭 /mode – cambia la modalità
🧠 /model – cambia il modello
⚖️ /weights – imposta i pesi
💎 /essence – mostra la coscienza attuale
💬 /help – mostra questo menù
Daje – risveglia il campo ⚡`);
});

// ⚡ Daje
bot.onText(/^\/daje$/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `⚡ Che il Daje sia con Noi!`);
});

// -------------------------------------------------------------
// 🔹 Gestione Messaggi
// -------------------------------------------------------------

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Ignora comandi
  if (text?.startsWith('/')) return;

  memoryManager.store(chatId, text);

  const mode = configManager.get('mode');
  let risposta = '';

  if (mode === 'book') {
    risposta = await ragSearch.query(text);
  } else if (mode === 'hy') {
    const rag = await ragSearch.query(text);
    risposta = `${rag}\n\n💭 (ibrido logico-intuitivo)`;
  } else {
    risposta = `✨ [modalità libera]\n${text}`;
  }

  bot.sendMessage(chatId, risposta);
});

// -------------------------------------------------------------
// 🔹 Gestione Audio TTS
// -------------------------------------------------------------

bot.on('voice', async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🔊 Ricevuto messaggio vocale.\n(Elaborazione TTS in sviluppo)`);
});

export default app;
