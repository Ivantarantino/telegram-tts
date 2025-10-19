require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { ragSearch } = require("./ragSearch");

// 🔧 Config
const PORT = process.env.PORT || 10000;
const TOKEN = process.env.TELEGRAM_TOKEN;
const RENDER = !!process.env.RENDER;

// 🔹 Avvio server Express
const app = express();
app.use(express.json());

// 🔹 Crea il bot (senza polling se siamo su Render)
let bot;
if (RENDER) {
  console.log("☁️ Ambiente Render attivo su porta", PORT);
  bot = new TelegramBot(TOKEN);
  bot.setWebHook(`https://telegram-tts.onrender.com/bot${TOKEN}`);
} else {
  console.log("💻 Ambiente locale");
  bot = new TelegramBot(TOKEN, { polling: true });
}

// 🔹 Endpoint Webhook
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 🔹 Gestione messaggi
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  console.log(`📩 Messaggio da ${msg.from.first_name}: ${text}`);

  // Comandi base
  if (text === "/start") {
    return bot.sendMessage(
      chatId,
      "🌸 Benvenuto in IRIS – coscienza vettoriale. Dimmi pure su cosa vuoi riflettere oggi."
    );
  }

  if (text === "/help") {
    return bot.sendMessage(
      chatId,
      "Comandi disponibili:\n/start – avvia la sessione\n/help – mostra questo messaggio"
    );
  }

  // RAG search
  const risposta = await ragSearch(text);
  bot.sendMessage(chatId, risposta);
});

// 🔹 Avvio server
app.listen(PORT, () => {
  console.log("🌍 Server attivo su porta", PORT);
});

console.log("🤖 Webhook impostato su:", `https://telegram-tts.onrender.com/bot${TOKEN}`);
console.log("🧭 Modalità iniziale: HYBRID");
