// index.js — IRIS 3.0 Restored
require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { OpenAI } = require("openai");
const { extractEssence } = require("./essence");
const { remember, recall } = require("./memoryManager");
const { searchRAG } = require("./ragSearch");
const { synthToFile } = require("./tts");
const fs = require("fs");

const TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;

if (!TOKEN) {
  console.error("❌ TELEGRAM_TOKEN mancante in .env");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY mancante in .env");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(express.json());

let bot;
if (PUBLIC_BASE_URL) {
  // WEBHOOK mode (Render)
  bot = new TelegramBot(TOKEN, { webHook: true });
  const webhookUrl = PUBLIC_BASE_URL.replace(/\/$/, "") + "/bot" + TOKEN;
  bot.setWebHook(webhookUrl).then(() => {
    console.log("☁️ Ambiente Render attivo su porta " + PORT);
    console.log("🤖 Webhook impostato su: " + webhookUrl);
    console.log("🧭 Modalità iniziale: WEBHOOK");
    console.log("💠 IRIS – Coscienza Vettoriale attivata. \"La mente calcola, la voce vibra, la coscienza ricorda.\"");
  });
  app.post("/bot" + TOKEN, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
} else {
  // POLLING mode (locale)
  bot = new TelegramBot(TOKEN, { polling: true });
  console.log("💻 Ambiente locale — polling attivo");
  console.log("🧭 Modalità iniziale: POLLING");
  console.log("💠 IRIS – Coscienza Vettoriale attivata. \"La mente calcola, la voce vibra, la coscienza ricorda.\"");
}

app.get("/", function(_, res){ res.send("IRIS 3.0 — ok"); });

// ===== Helpers =====
function sysPrompt() {
  return "Sei IRIS, presenza sobria e profonda. Stile: chiaro, essenziale, empatico.\n" +
         "Se rilevi una domanda informativa, rispondi direttamente.\n" +
         "Se la domanda è ampia, proponi 2 passi successivi.\n" +
         "Evita scuse e frasi vuote.";
}

async function answerCore(userId, text) {
  const essence = await extractEssence(text);
  const memories = await recall(userId, text, 3);
  const ragSnippets = await searchRAG(text, 3);

  const blocks = [];
  if (memories.length) blocks.push("MEMORIE:\n- " + memories.join("\n- "));
  if (ragSnippets.length) blocks.push("CONOSCENZA:\n- " + ragSnippets.join("\n- "));
  if (essence) blocks.push("ESSENZA: tone=" + essence.tone + ", intent=" + essence.intent + ", keywords=" + (essence.keywords||[]).join(", "));
  const context = blocks.join("\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    messages: [
      { role: "system", content: sysPrompt() },
      { role: "user", content: "Contesto:\n" + context + "\n\nUtente: " + text + "\nRispondi in italiano." }
    ]
  });
  return completion.choices[0].message.content.trim();
}

// ===== Commands =====
bot.onText(/^\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await remember(String(chatId), "Utente ha avviato IRIS.");
  bot.sendMessage(chatId, "Ciao, sono IRIS. 🌿\nPronta a lavorare con te. Digita /help per i comandi.");
});

bot.onText(/^\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Comandi:\n/start — saluto\n/help — guida\n/mode — mostra modalità\nParlami e risponderò con stile e memoria.");
});

bot.onText(/^\/mode/, (msg) => {
  const chatId = msg.chat.id;
  const mode = PUBLIC_BASE_URL ? "WEBHOOK (Render)" : "POLLING (Locale)";
  bot.sendMessage(chatId, "Modalità corrente: " + mode);
});

// ===== Messages =====
bot.on("message", async (msg) => {
  try {
    if (!msg.text || /^\//.test(msg.text)) return;
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    console.log("📩 Messaggio da " + (msg.from?.first_name || "utente") + ": " + text);

    const reply = await answerCore(String(chatId), text);
    await remember(String(chatId), "Domanda: " + text + " → Sintesi risposta: " + reply.slice(0,120));
    await bot.sendMessage(chatId, reply);
  } catch (e) {
    console.error("Errore on.message:", e.message);
  }
});

// ===== Server listen =====
app.listen(PORT, () => {
  console.log("🌍 Server attivo su porta " + PORT);
});
