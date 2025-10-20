// index.js — IRIS 2.1 (Modalità selezionabili + Webhook stabile)
// Autore: Ivano Tarantino – Ottobre 2025

require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { ragSearch } = require("./ragSearch");
const OpenAI = require("openai");

// === CONFIG ===
const PORT = process.env.PORT || 10000;
const TOKEN = process.env.TELEGRAM_TOKEN;
const RENDER = !!process.env.RENDER;
const BASE_URL = "https://telegram-tts.onrender.com";

// === OPENAI CLIENT (per modalità libera e ibrida) ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === EXPRESS APP ===
const app = express();
app.use(express.json());

// === TELEGRAM BOT ===
let bot;
if (RENDER) {
  console.log("☁️ Ambiente Render attivo su porta", PORT);
  bot = new TelegramBot(TOKEN);
  bot.setWebHook(`${BASE_URL}/bot${TOKEN}`);
} else {
  console.log("💻 Ambiente locale");
  bot = new TelegramBot(TOKEN, { polling: true });
}

// === VARIABILE STATO ===
let currentMode = process.env.MODE?.toLowerCase() || "hybrid";

// === FUNZIONI DI RISPOSTA ===

// 🔹 Modalità libera (solo GPT)
async function liberaModeResponse(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Sei IRIS, assistente consapevole e gentile creato da Ivano Tarantino." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });
  return completion.choices[0].message.content.trim();
}

// 🔹 Modalità libro (solo RAG)
async function libroModeResponse(prompt) {
  const risposta = await ragSearch(prompt);
  return risposta;
}

// 🔹 Modalità ibrida
async function hybridModeResponse(prompt) {
  const rag = await ragSearch(prompt);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Sei IRIS, intelligenza che unisce conoscenza testuale e intuizione propria." },
      { role: "user", content: `Contesto:\n${rag}\n\nDomanda: ${prompt}` },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });

  const mix = completion.choices[0].message.content.trim();
  return mix;
}

// === ENDPOINT WEBHOOK ===
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// === HANDLER MESSAGGI ===
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text) return;

    console.log(`📩 Messaggio da ${msg.from.first_name}: ${text}`);

    // 🔸 /start
    if (text === "/start") {
      return bot.sendMessage(
        chatId,
        "🌸 Benvenuto in IRIS – Coscienza vettoriale.\nUsa /mode per scegliere la modalità:\n\n" +
          "📚 /mode libro – risposte solo dal materiale caricato\n" +
          "💬 /mode libera – risposte libere GPT\n" +
          "⚡ /mode ibrida – combina entrambe le fonti"
      );
    }

    // 🔸 /help
    if (text === "/help") {
      return bot.sendMessage(
        chatId,
        "📘 *Guida rapida IRIS*\n\n" +
          "/start – avvia la sessione\n" +
          "/mode – mostra o cambia la modalità attuale\n" +
          "/help – mostra questo messaggio",
        { parse_mode: "Markdown" }
      );
    }

    // 🔸 /mode
    if (text.startsWith("/mode")) {
      const parts = text.split(" ");
      if (parts.length === 1) {
        return bot.sendMessage(
          chatId,
          `🧭 Modalità attuale: *${currentMode.toUpperCase()}*\n\n` +
            "Puoi scegliere:\n" +
            "📚 /mode libro\n" +
            "💬 /mode libera\n" +
            "⚡ /mode ibrida",
          { parse_mode: "Markdown" }
        );
      }

      const newMode = parts[1].toLowerCase();
      if (["libro", "libera", "ibrida"].includes(newMode)) {
        currentMode = newMode;
        return bot.sendMessage(chatId, `✅ Modalità impostata su *${newMode.toUpperCase()}*`, {
          parse_mode: "Markdown",
        });
      } else {
        return bot.sendMessage(chatId, "❌ Modalità non riconosciuta. Usa: libro | libera | ibrida.");
      }
    }

    // 🔹 Routing in base alla modalità
    let risposta = "";
    if (currentMode === "libro") {
      risposta = await libroModeResponse(text);
    } else if (currentMode === "libera") {
      risposta = await liberaModeResponse(text);
    } else {
      risposta = await hybridModeResponse(text);
    }

    await bot.sendMessage(chatId, risposta);
  } catch (err) {
    console.error("Errore handler:", err);
  }
});

// === AVVIO SERVER ===
app.listen(PORT, () => {
  console.log("🌍 Server attivo su porta", PORT);
  console.log("🤖 Webhook impostato su:", `${BASE_URL}/bot${TOKEN}`);
  console.log("🧭 Modalità iniziale:", currentMode.toUpperCase());
});
