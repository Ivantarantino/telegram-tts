/**
 * IRIS v3.0 — Telegram bot con RAG e Qdrant
 * Modalità: Webhook (Render)
 * Autore: Ivano Tarantino
 */

require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { ragSearch } = require("./ragSearch");

const TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;
const URL = process.env.RENDER_EXTERNAL_URL; // Render assegna questo
const MODE = process.env.MODE || "HYBRID";

const app = express();
app.use(express.json());

// 🧠 Stato IRIS
let botMode = MODE;
let botReady = false;

// 🛰️ Inizializza bot in modalità webhook
const bot = new TelegramBot(TOKEN, { webHook: true });
const webhookUrl = `${URL}/bot${TOKEN}`;
bot.setWebHook(webhookUrl);

// 🌍 Express route per gestire aggiornamenti Telegram
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 📡 Avvio server
app.listen(PORT, () => {
  console.log(`☁️ Ambiente Render attivo su porta ${PORT}`);
  console.log(`🤖 Webhook impostato su: ${webhookUrl}`);
  console.log(`🧭 Modalità iniziale: ${botMode}`);
  botReady = true;
});

// 💬 Gestione messaggi utente
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userInput = msg.text?.trim();

  console.log(`📩 Messaggio da ${msg.from.first_name}: ${userInput}`);

  if (!userInput) {
    return bot.sendMessage(chatId, "Non ho ricevuto testo comprensibile. Riprova 🙏");
  }

  // Comandi base (temporanei)
  if (userInput.startsWith("/start")) {
    return bot.sendMessage(
      chatId,
      "🌸 Benvenuto in IRIS — intelligenza vettoriale.\nParla con me liberamente o chiedi /mode per cambiare modalità."
    );
  }

  if (userInput.startsWith("/mode")) {
    botMode = botMode === "HYBRID" ? "RAG" : "HYBRID";
    return bot.sendMessage(chatId, `🔄 Modalità cambiata: ${botMode}`);
  }

  if (userInput.startsWith("/help")) {
    return bot.sendMessage(
      chatId,
      "🧭 Comandi disponibili:\n/start — avvia IRIS\n/mode — cambia modalità\n/help — mostra questo messaggio"
    );
  }

  // ✨ Ricerca RAG (intelligenza contestuale)
  try {
    const reply = await ragSearch(userInput);
    await bot.sendMessage(chatId, reply);
  } catch (err) {
    console.error("❌ Errore durante la risposta:", err);
    await bot.sendMessage(
      chatId,
      "Si è verificato un errore interno in IRIS. Riprova tra qualche istante."
    );
  }
});

// 🧠 Gestione errori globali
process.on("unhandledRejection", (err) => {
  console.error("⚠️ Errore non gestito:", err);
});
