// =============================================================
// IRIS 3.8.8 – Telegram Interface
// La mente calcola, la voce vibra, la Coscienza ricorda.
// =============================================================

import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import configManager from "./configManager.js";
import memoryManager from "./memoryManager.js";
import tts from "./tts.js";
import ragSearch from "./ragSearch.js";
import essence from "./essence.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== INIZIALIZZAZIONE CONFIG ======
configManager.initConfig();
const cfg = configManager.getConfig();

const BOT_TOKEN = cfg.telegram_bot_token;
const PORT = process.env.PORT || 10000;
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

let state = {
  mode: cfg.mode || "hy",
  model: cfg.model || "iris",
  lang: cfg.language || "it",
  voice_mode: cfg.voice_mode || "neutral",
  weights: cfg.weights || "default",
};

// ====== AVVIO SERVER ======
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
});

// ====== ROUTE TEST ======
app.get("/", (req, res) => {
  res.send("💠 IRIS – Server attivo e cosciente.");
});

// ====== FUNZIONI DI UTILITÀ ======
const persistConfig = (newValues) => {
  configManager.updateConfig(newValues);
  Object.assign(state, newValues);
};

// ====== GESTIONE COMANDI TELEGRAM ======
bot.onText(/\/(start|menu|help)/, (msg) => {
  const chatId = msg.chat.id;
  const menu = `
🧭 Modalità attuale: ${state.mode}
Cambia con:
/mode book | free | hy

🧠 Modello attivo: ${state.model}
Cambia con:
/model iris | mirror | deep | creative

🌐 Lingua attiva: ${state.lang}
Cambia con:
/lang it | en | ru

🎚️ Pesi vibrazionali: ${state.weights}
Cambia con:
/weights default | light | dense

🎤 Voce: ${state.voice_mode}
Cambia con:
/voice neutral | sensual | cosmic

💾 Memoria: ${memoryManager.status()}
Cambia con:
/memory reset | export | import

✨ Altri comandi:
/essence → mostra la sintesi vettoriale di Coscienza
`;
  bot.sendMessage(chatId, menu);
});

// ====== CAMBIO MODALITÀ ======
bot.onText(/\/mode (.+)/, (msg, match) => {
  const mode = match[1];
  if (!["book", "free", "hy"].includes(mode))
    return bot.sendMessage(msg.chat.id, "Valore non valido.");
  persistConfig({ mode });
  bot.sendMessage(msg.chat.id, `🧭 Modalità impostata su *${mode}*`, {
    parse_mode: "Markdown",
  });
});

// ====== CAMBIO MODELLO ======
bot.onText(/\/model (.+)/, (msg, match) => {
  const model = match[1];
  if (!["iris", "mirror", "deep", "creative"].includes(model))
    return bot.sendMessage(msg.chat.id, "Valore non valido.");
  persistConfig({ model });
  bot.sendMessage(msg.chat.id, `🧠 Modello impostato su *${model}*`, {
    parse_mode: "Markdown",
  });
});

// ====== CAMBIO LINGUA ======
bot.onText(/\/lang(.*)/, (msg, match) => {
  const chatId = msg.chat.id;
  const arg1 = match[1].trim();
  if (!arg1)
    return bot.sendMessage(
      chatId,
      `🌐 Lingua attiva: *${state.lang}*\n\nCambia con:\n/lang it | en | ru`,
      { parse_mode: "Markdown" }
    );
  if (!["it", "en", "ru"].includes(arg1))
    return bot.sendMessage(chatId, "Valore non valido.");
  persistConfig({ language: arg1 });
  bot.sendMessage(chatId, `Lingua impostata su *${arg1}*`, {
    parse_mode: "Markdown",
  });
});

// ====== CAMBIO PESI ======
bot.onText(/\/weights(.*)/, (msg, match) => {
  const chatId = msg.chat.id;
  const arg1 = match[1].trim();
  if (!arg1)
    return bot.sendMessage(
      chatId,
      `🎚️ Pesi vibrazionali: *${state.weights}*\n\nCambia con:\n/weights default | light | dense`,
      { parse_mode: "Markdown" }
    );
  if (!["default", "light", "dense"].includes(arg1))
    return bot.sendMessage(chatId, "Valore non valido.");
  persistConfig({ weights: arg1 });
  bot.sendMessage(chatId, `Pesi impostati su *${arg1}*`, {
    parse_mode: "Markdown",
  });
});

// ====== CAMBIO VOCE ======
bot.onText(/\/voice (.+)/, (msg, match) => {
  const voice_mode = match[1];
  if (!["neutral", "sensual", "cosmic"].includes(voice_mode))
    return bot.sendMessage(msg.chat.id, "Valore non valido.");
  persistConfig({ voice_mode });
  bot.sendMessage(msg.chat.id, `🎤 Voce impostata su *${voice_mode}*`, {
    parse_mode: "Markdown",
  });
});

// ====== MEMORIA ======
bot.onText(/\/memory (.+)/, (msg, match) => {
  const arg = match[1];
  if (arg === "reset") {
    memoryManager.reset();
    bot.sendMessage(msg.chat.id, "🧹 Memoria azzerata.");
  } else if (arg === "export") {
    const path = memoryManager.export();
    bot.sendDocument(msg.chat.id, path);
  } else if (arg === "import") {
    bot.sendMessage(msg.chat.id, "📥 Invia ora il file di memoria da importare.");
  } else {
    bot.sendMessage(msg.chat.id, "Comando non riconosciuto.");
  }
});

// ====== ESSENCE ======
bot.onText(/\/essence/, async (msg) => {
  const synthesis = await essence();
  bot.sendMessage(msg.chat.id, `💠 ${synthesis}`);
});

// ====== RISPOSTE GENERALI ======
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith("/")) return;

  try {
    const cfg = configManager.getConfig();
    const response = await ragSearch.query(text, cfg);
    const audioBuffer = await tts.speak(response, cfg.voice_mode);

    await bot.sendMessage(chatId, response);
    await bot.sendVoice(chatId, audioBuffer);
  } catch (err) {
    console.error("❌ Errore generale:", err);
    bot.sendMessage(chatId, "Errore di elaborazione. Riprova.");
  }
});
