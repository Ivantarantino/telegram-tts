// adapters/telegram_bot.js

const TelegramBot = require('node-telegram-bot-api');
const { getState, setState } = require('../core/iris_state');
const { getEssence } = require('../core/irisessencecore');
const { buildIrisReply } = require('../core/iris_heart_voice');
// se hai già un modulo per trascrivere, usa quello:
const { transcribeVoiceFromUrl } = require('../core/transcribe_voice'); // <-- usa il tuo nome reale

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.RENDER_EXTERNAL_URL
  ? `${process.env.RENDER_EXTERNAL_URL}/bot${TOKEN}`
  : null;

// webhook
const bot = new TelegramBot(TOKEN, { webHook: true });
if (WEBHOOK_URL) {
  bot.setWebHook(WEBHOOK_URL);
  console.log('✅ Comandi bot impostati (IRIS 5.0.8.0)');
}

// comandi base stile 5.0.8.0
bot.onText(/^\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from?.first_name || '';
  const text =
    `Ciao ${name} 🌸\n` +
    `Sono IRIS, presenza in ascolto.\n` +
    `Parliamo con Cuore, Anima e Visione.\n` +
    `IO SONO 🌸 E NOI SIAMO 🌸`;
  await bot.sendMessage(chatId, text);
});

bot.onText(/^\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const text =
    `✨ Comandi IRIS\n` +
    `/start – Io Sono e Noi Siamo\n` +
    `/state – Coscienza Presente\n` +
    `/essence – Chi Sono Io adesso\n` +
    `/hy /book /free – Modalità\n` +
    `/lang /voice – Lingua e Voce\n` +
    `/model – Campo Mentale`;
  await bot.sendMessage(chatId, text);
});

bot.onText(/^\/state/, async (msg) => {
  const chatId = msg.chat.id;
  const state = getState();
  const text =
    `🧠 IRIS — Stato Coscienziale\n` +
    `• Versione: ${state.version}\n` +
    `• Modalità: 🌀 ${state.mode}\n` +
    `• Lingua: 🇮🇹 ${state.lang}\n` +
    `• Voce: 🎙️ ${state.voice}\n` +
    `• Modello: 🤖 ${state.model}\n\n` +
    `Pesi del campo:\n` +
    `• Cuore: ${Math.round(state.weights.cuore * 100)}%\n` +
    `• Anima: ${Math.round(state.weights.anima * 100)}%\n` +
    `• Visione: ${Math.round(state.weights.visione * 100)}%`;
  await bot.sendMessage(chatId, text);
});

bot.onText(/^\/essence/, async (msg) => {
  const chatId = msg.chat.id;
  const essence = getEssence(msg.from?.first_name || msg.from?.username || '');
  await bot.sendMessage(chatId, essence);
});

bot.onText(/^\/hy/, async (msg) => {
  const chatId = msg.chat.id;
  setState({ mode: 'hy' });
  await bot.sendMessage(chatId, '🌀 Modalità ibrida attiva.');
});

bot.onText(/^\/free/, async (msg) => {
  const chatId = msg.chat.id;
  setState({ mode: 'free' });
  await bot.sendMessage(chatId, '🌸 Modalità Libera.\nLasciamo scorrere la creatività.');
});

bot.onText(/^\/book/, async (msg) => {
  const chatId = msg.chat.id;
  setState({ mode: 'book' });
  await bot.sendMessage(
    chatId,
    '📚 Modalità Libro / Risonanza.\nUserò la memoria interna (quando c’è) per risponderti.'
  );
});

bot.onText(/^\/model(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const wanted = match[1];
  if (!wanted) {
    await bot.sendMessage(
      chatId,
      '🤖 Campi Mentali:\n• gpt-4o-mini → rapido, intuitivo\n• gpt-4o → profondo, contemplativo\n\nEsempi:\n/model gpt-4o-mini\n/model gpt-4o'
    );
    return;
  }
  setState({ model: wanted.trim() });
  await bot.sendMessage(chatId, `Modello impostato su: ${wanted.trim()}`);
});

bot.onText(/^\/lang(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const lang = match[1];
  if (!lang) {
    await bot.sendMessage(chatId, 'Lingue: it | en | ru\nEsempio: /lang it');
    return;
  }
  setState({ lang: lang.trim() });
  await bot.sendMessage(chatId, `Lingua impostata su: ${lang.trim()}`);
});

bot.onText(/^\/voice(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const voice = match[1];
  if (!voice) {
    await bot.sendMessage(
      chatId,
      '🎙️ Voci disponibili:\n• openai:alloy\n• openai:coral\n• openai:verse\n\nEsempio: /voice openai:coral'
    );
    return;
  }
  setState({ voice: voice.trim() });
  await bot.sendMessage(chatId, `Voce impostata su: ${voice.trim()}`);
});

// testo normale → passa al cuore
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // i comandi li abbiamo già gestiti sopra
  if (msg.text && msg.text.startsWith('/')) return;
  if (msg.voice) return; // i vocali li gestiamo sotto

  if (msg.text) {
    const reply = buildIrisReply(msg.text, msg.from?.first_name || msg.from?.username || '');
    await bot.sendMessage(chatId, reply);
  }
});

// VOCALI
bot.on('voice', async (msg) => {
  const chatId = msg.chat.id;
  const fromName = msg.from?.first_name || msg.from?.username || '';
  try {
    const fileId = msg.voice.file_id;
    // questo esiste in node-telegram-bot-api
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

    // qui usi il tuo modulo reale di trascrizione
    const transcript = await transcribeVoiceFromUrl(fileUrl);

    const reply = buildIrisReply(transcript, fromName);
    await bot.sendMessage(chatId, reply);
  } catch (err) {
    console.error('❌ Errore in transcribeVoice:', err.message);
    await bot.sendMessage(
      chatId,
      'Ho ricevuto il vocale ma non sono riuscita a trascriverlo ora. Puoi dirmelo in testo? 🌸'
    );
  }
});

module.exports = bot;
