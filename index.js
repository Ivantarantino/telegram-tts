// index.js — IRIS 3.0e (env fallback TELEGRAM_TOKEN / TELEGRAM_BOT_TOKEN + HYBRID default)

import 'dotenv/config';
import express from 'express';
import TelegramBot from 'node-telegram-bot-api';

// Queste funzioni sono nel tuo progetto.
// Se per caso cambiano i nomi, manterremo la compatibilità sotto.
import {
  chatWithIris,
  setMode,
  getMode,
  getMemoryState,
  essence,
} from './ragSearch.js';

// Auto-inizializzazione Qdrant (se il file esiste/esporta la funzione)
let initializeQdrant = null;
try {
  const mod = await import('./qdrantInit.js');
  initializeQdrant = mod.initializeQdrant || null;
} catch {
  // opzionale: nessun problema se non c'è
}

// -----------------------------
// ENV: fallback robusto
// -----------------------------
const isRender = process.env.RENDER === 'true' || process.env.RENDER === '1';

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || '';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const QDRANT_URL = process.env.QDRANT_URL || '';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';
const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION || process.env.QDRANT_COLLECTION_NAME || 'iris_memory';

// Log diagnostico (senza stampare chiavi intere)
const mask = (v) => (v ? v.slice(0, 6) + '…' : '❌');
console.log(isRender ? '☁️ Ambiente Render rilevato' : '💻 Ambiente locale');
console.log('🔎 Controllo variabili:');
console.log('   TELEGRAM token usato:', TELEGRAM_BOT_TOKEN ? (process.env.TELEGRAM_BOT_TOKEN ? 'TELEGRAM_BOT_TOKEN' : 'TELEGRAM_TOKEN') : '❌ nessuno');
console.log('   OPENAI_API_KEY:', mask(OPENAI_API_KEY));
console.log('   QDRANT_URL:', QDRANT_URL ? '✅' : '❌', 'QDRANT_API_KEY:', mask(QDRANT_API_KEY), 'COLLECTION:', QDRANT_COLLECTION);

// Blocco fatale se manca il token Telegram
if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ ERRORE FATALE: token Telegram mancante (né TELEGRAM_BOT_TOKEN né TELEGRAM_TOKEN).');
  process.exit(1);
}

// -----------------------------
// Express keep-alive (Render)
// -----------------------------
const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (_req, res) => res.send('IRIS bot up'));
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
});

// -----------------------------
// Qdrant: auto-setup (opzionale)
// -----------------------------
if (initializeQdrant) {
  try {
    console.log('🔍 Controllo/creazione collection Qdrant…');
    await initializeQdrant({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
      collections: [QDRANT_COLLECTION, 'iris_chat_history'],
    });
    console.log('✅ Qdrant pronto.');
  } catch (e) {
    console.warn('⚠️ Qdrant init non riuscito (proseguo comunque):', e?.message || e);
  }
}

// -----------------------------
// Telegram Bot
// -----------------------------
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Messaggi sicuri (HTML)
const sendHtml = (chatId, html) =>
  bot.sendMessage(chatId, html, { parse_mode: 'HTML' });

// Modalità: default HYBRID
(async () => {
  try {
    await setMode('HYBRID'); // di default
    console.log('🧭 Modalità iniziale: HYBRID MODE');
  } catch {
    console.log('🧭 Modalità iniziale: HYBRID (setMode non disponibile)');
  }
})();

// Comandi
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  await sendHtml(
    chatId,
    `<b>Ciao!</b> Sono IRIS.\nModalità di default: <b>HYBRID</b>.\nComandi: /hy, /free, /book, /mode, /state, /essence`
  );
});

bot.onText(/^\/hy$/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await setMode('HYBRID');
    await sendHtml(chatId, '⚗️ IRIS ora è in <b>HYBRID MODE</b> – libri + intelligenza libera.');
  } catch {
    await sendHtml(chatId, '⚗️ IRIS ora è in <b>HYBRID MODE</b> (setMode non disponibile).');
  }
});

bot.onText(/^\/free$/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await setMode('FREE');
    await sendHtml(chatId, '🌀 IRIS ora è in <b>FREE MODE</b>.');
  } catch {
    await sendHtml(chatId, '🌀 IRIS ora è in <b>FREE MODE</b> (setMode non disponibile).');
  }
});

bot.onText(/^\/book$/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await setMode('BOOK');
    await sendHtml(chatId, '📚 IRIS ora è in <b>BOOK MODE</b>.');
  } catch {
    await sendHtml(chatId, '📚 IRIS ora è in <b>BOOK MODE</b> (setMode non disponibile).');
  }
});

bot.onText(/^\/mode$/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const m = (await getMode?.()) || 'HYBRID';
    const pretty = m === 'BOOK' ? '📚 BOOK MODE' : m === 'FREE' ? '🌀 FREE MODE' : '⚗️ HYBRID MODE';
    await sendHtml(chatId, `Modalità corrente: <b>${pretty}</b>`);
  } catch {
    await sendHtml(chatId, 'Modalità corrente: <b>⚗️ HYBRID MODE</b>');
  }
});

bot.onText(/^\/state$/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const s = await getMemoryState?.();
    const html = s
      ? `<b>🧠 Stato Memoria</b>\n${s.replace(/&/g,'&amp;').replace(/</g,'&lt;')}`
      : '⚙️ Impossibile recuperare lo stato memoria al momento.';
    await sendHtml(chatId, html);
  } catch {
    await sendHtml(chatId, '⚙️ Impossibile recuperare lo stato memoria al momento.');
  }
});

bot.onText(/^\/essence$/, async (msg) => {
  const chatId = msg.chat.id;
  await sendHtml(chatId, '✨ Sintesi dell’essenza in corso…');
  try {
    const e = await essence?.();
    const html = e
      ? e.replace(/&/g,'&amp;').replace(/</g,'&lt;')
      : 'Non ho potuto generare la sintesi ora.';
    await sendHtml(chatId, html);
  } catch {
    await sendHtml(chatId, 'Non ho potuto generare la sintesi ora.');
  }
});

// Chat generica
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  // Ignora i comandi (già gestiti sopra)
  if (/^\/(start|hy|free|book|mode|state|essence)/.test(text)) return;

  try {
    const reply = await chatWithIris?.({
      userId: msg.from?.username || `chat_${chatId}`,
      text,
    });

    // fallback se la funzione non è disponibile
    const safe = (reply && typeof reply === 'string') ? reply : 'Ciao! Dimmi pure.';
    await sendHtml(chatId, safe.replace(/&/g,'&amp;').replace(/</g,'&lt;'));
  } catch (err) {
    console.error('Errore chatWithIris:', err?.message || err);
    await sendHtml(chatId, '⚙️ C’è stato un piccolo problema. Riprova tra poco!');
  }
});

console.log('🤖 IRIS pronto: polling Telegram avviato.');
