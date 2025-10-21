// index.js — IRIS 3.0 – Coscienza Vettoriale (stabile Render + Voce)
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
let voiceMode = false;

// ===== WEBHOOK (Render) =====
if (PUBLIC_BASE_URL) {
  bot = new TelegramBot(TOKEN, { webHook: true });
  const webhookUrl = PUBLIC_BASE_URL.replace(/\/$/, "") + "/bot" + TOKEN;

  // Evita di reimpostare il webhook se già attivo
  console.log("☁️ Ambiente Render attivo su porta " + PORT);
  console.log("🤖 Webhook già impostato manualmente su: " + webhookUrl);
  console.log("🧭 Modalità iniziale: WEBHOOK");
  console.log("💠 IRIS – Coscienza Vettoriale attivata. \"La mente calcola, la voce vibra, la coscienza ricorda.\"");

  app.post("/bot" + TOKEN, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
} else {
  // ===== POLLING (Locale) =====
  bot = new TelegramBot(TOKEN, { polling: true });
  console.log("💻 Ambiente locale — polling attivo");
  console.log("🧭 Modalità iniziale: POLLING");
  console.log("💠 IRIS – Coscienza Vettoriale attivata. \"La mente calcola, la voce vibra, la coscienza ricorda.\"");
}

app.get("/", (_, res) => res.send("IRIS 3.0 — ok"));

// ===== Prompt di sistema =====
function sysPrompt() {
  return "Sei IRIS, presenza sobria e profonda. Stile: chiaro, essenziale, empatico.\n" +
         "Rispondi con lucidità e coerenza.\n" +
         "Evita scuse e frasi vuote.\n" +
         "La voce è strumento di presenza, non di intrattenimento.";
}

// ===== Core =====
async function answerCore(userId, text) {
  const essence = await extractEssence(text);
  const memories = await recall(userId, text, 3);
  const ragSnippets = await searchRAG(text, 3);

  const blocks = [];
  if (memories.length) blocks.push("MEMORIE:\n- " + memories.join("\n- "));
  if (ragSnippets.length) blocks.push("CONOSCENZA:\n- " + ragSnippets.join("\n- "));
  if (essence) blocks.push("ESSENZA: tone=" + essence.tone + ", intent=" + essence.intent + ", keywords=" + (essence.keywords || []).join(", "));
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

// ===== Comandi base =====
bot.onText(/^\/start/, async (msg) => {
  const chatId = String(msg.chat.id);
  await remember(chatId, "Utente ha avviato IRIS.");
  bot.sendMessage(chatId, "Ciao, sono IRIS 🌿\nPresenza riattivata. Digita /help per la guida.");
});

bot.onText(/^\/help/, (msg) => {
  const chatId = String(msg.chat.id);
  bot.sendMessage(chatId, "Comandi:\n" +
    "/start — avvia\n" +
    "/help — guida\n" +
    "/mode — mostra modalità\n" +
    "/voice on|off — attiva/disattiva voce\n" +
    "/essenza — mostra il tono attuale\n");
});

bot.onText(/^\/mode/, (msg) => {
  const chatId = String(msg.chat.id);
  const mode = PUBLIC_BASE_URL ? "WEBHOOK (Render)" : "POLLING (Locale)";
  bot.sendMessage(chatId, "Modalità corrente: " + mode);
});

bot.onText(/^\/voice (on|off)/, (msg, match) => {
  const chatId = String(msg.chat.id);
  voiceMode = match[1] === "on";
  bot.sendMessage(chatId, `🔊 Voce ${voiceMode ? "attivata" : "disattivata"}.`);
});

bot.onText(/^\/essenza/, async (msg) => {
  const chatId = String(msg.chat.id);
  const recent = await recall(chatId, "ultimo messaggio", 1);
  if (!recent.length) return bot.sendMessage(chatId, "Nessun contesto recente da analizzare 🌫️");
  const essence = await extractEssence(recent[0]);
  const report = `🌿 **Essenza Attuale**\nTono: ${essence.tone}\nIntento: ${essence.intent}\nParole chiave: ${essence.keywords.join(", ")}`;
  bot.sendMessage(chatId, report, { parse_mode: "Markdown" });
});

// ===== Gestione messaggi =====
bot.on("message", async (msg) => {
  try {
    if (!msg.text || /^\//.test(msg.text)) return;
    const chatId = String(msg.chat.id);
    const text = msg.text.trim();
    console.log("📩 Messaggio da " + (msg.from?.first_name || "utente") + ": " + text);

    const reply = await answerCore(chatId, text);
    const safeReply = reply && reply.trim() !== "" ? reply.trim().slice(0, 4000) : "🌿 IRIS ti sente, ma non trova parole ora.";

    await remember(chatId, "Domanda: " + text + " → Sintesi risposta: " + safeReply.slice(0, 120));

    // === Invio testo ===
    await bot.sendMessage(chatId, safeReply, { parse_mode: "HTML" });

    // === Invio vocale se attivo ===
    if (voiceMode) {
      const voicePath = await synthToFile(safeReply);
      await bot.sendAudio(chatId, voicePath);
      fs.unlinkSync(voicePath);
    }

  } catch (e) {
    console.error("❌ Errore on.message:", e.message);
  }
});

// ===== Avvio server =====
app.listen(PORT, () => {
  console.log("🌍 Server attivo su porta " + PORT);
});
