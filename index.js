import express from "express";
import TelegramBot from "node-telegram-bot-api";
import bodyParser from "body-parser";
import tts from "./tts.js";
import ragSearch from "./ragSearch.js";
import memoryManager from "./memoryManager.js";
import configManager from "./configManager.js";
import essence from "./essence.js";

const app = express();
const PORT = process.env.PORT || 10000;

// Inizializzazione configurazione
configManager.initConfig();
const cfg = configManager.getConfig();

// Inizializzazione bot Telegram
const bot = new TelegramBot(cfg.telegram_token, { polling: true });

// Middleware
app.use(bodyParser.json());
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
});

// Gestione comandi Telegram
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "✨ Benvenuto in IRIS!\n\n" +
      "Comandi disponibili:\n" +
      "/help – mostra i comandi\n" +
      "/mode – cambia modalità di risposta\n" +
      "/voice – cambia modalità voce\n" +
      "/lang – cambia lingua di risposta\n" +
      "/memory – mostra memoria attuale\n" +
      "/clear – cancella memoria\n\n" +
      "Che il Daje sia con Noi 💠"
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🧭 *Menù di controllo IRIS*\n\n" +
      `🧭 Modalità attuale: ${cfg.mode}\nCambia con:\n/mode book | free | hy\n\n` +
      `🎙️ Voce attuale: ${cfg.voice_mode}\nCambia con:\n/voice soft | deep | cosmic\n\n` +
      `🌐 Lingua attiva: ${cfg.language}\nCambia con:\n/lang it | en | ru\n\n` +
      "🧠 Memoria:\n/memory – mostra memoria\n/clear – cancella memoria\n\n" +
      "Che il Daje sia con Noi 💠",
    { parse_mode: "Markdown" }
  );
});

// Modalità di risposta
bot.onText(/\/mode (.+)/, (msg, match) => {
  const mode = match[1].trim();
  if (!["book", "free", "hy"].includes(mode)) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ Modalità non valida. Usa:\n/mode book | free | hy"
    );
  }
  cfg.mode = mode;
  configManager.saveConfig(cfg);
  bot.sendMessage(msg.chat.id, `✅ Modalità cambiata in: ${mode}`);
});

// Voce
bot.onText(/\/voice (.+)/, (msg, match) => {
  const voice = match[1].trim();
  if (!["soft", "deep", "cosmic"].includes(voice)) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ Modalità voce non valida. Usa:\n/voice soft | deep | cosmic"
    );
  }
  cfg.voice_mode = voice;
  configManager.saveConfig(cfg);
  bot.sendMessage(msg.chat.id, `✅ Voce cambiata in: ${voice}`);
});

// Lingua
bot.onText(/\/lang (.+)/, (msg, match) => {
  const lang = match[1].trim();
  if (!["it", "en", "ru"].includes(lang)) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ Lingua non valida. Usa:\n/lang it | en | ru"
    );
  }
  cfg.language = lang;
  configManager.saveConfig(cfg);
  bot.sendMessage(msg.chat.id, `✅ Lingua cambiata in: ${lang}`);
});

// Mostra memoria
bot.onText(/\/memory/, async (msg) => {
  const memory = await memoryManager.getMemory();
  bot.sendMessage(msg.chat.id, `🧠 Memoria attuale:\n${memory}`);
});

// Cancella memoria
bot.onText(/\/clear/, async (msg) => {
  await memoryManager.clearMemory();
  bot.sendMessage(msg.chat.id, "🧹 Memoria cancellata con successo.");
});

// Messaggi generali
bot.on("message", async (msg) => {
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  try {
    const response = await ragSearch.query(text, cfg);
    const audioBuffer = await tts.speak(response, cfg.voice_mode);
    await bot.sendVoice(msg.chat.id, audioBuffer, {}, { filename: "iris.ogg" });
  } catch (err) {
    console.error("❌ Errore:", err);
    bot.sendMessage(msg.chat.id, "Si è verificato un errore interno.");
  }
});
