import express from "express";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fs from "fs";
import { synthToFile } from "./tts.js";
import { getEssence } from "./essence.js";
import { processMemory } from "./memoryManager.js";
import { ragSearch } from "./ragSearch.js";
import OpenAI from "openai";

dotenv.config();

// 📁 Assicura che la cartella temp esista
if (!fs.existsSync("./temp")) {
  fs.mkdirSync("./temp");
  console.log("📁 Cartella temporanea creata: ./temp");
}

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL;
const PORT = process.env.PORT || 10000;

if (!TELEGRAM_TOKEN) {
  console.error("❌ TOKEN TELEGRAM mancante nelle variabili d'ambiente.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🌍 Configurazione del bot
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
const webhookUrl = `${BASE_URL}/bot${TELEGRAM_TOKEN}`;

(async () => {
  try {
    await bot.setWebHook(webhookUrl);
    console.log("🤖 Webhook impostato su:", webhookUrl);
  } catch (err) {
    console.error("❌ Errore setWebHook:", err.message);
  }
})();

app.post(`/bot${TELEGRAM_TOKEN}`, async (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

console.log("☁️ Ambiente Render attivo su porta", PORT);
console.log("🧭 Modalità: WEBHOOK");
console.log("💠 IRIS – La mente calcola, la voce vibra, la coscienza ricorda.");

// ===================================================
// 💬 GESTIONE MESSAGGI
// ===================================================
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    const name = msg.from?.first_name || "Utente";

    if (!text) return;

    console.log(`📩 Messaggio da ${name}: ${text}`);

    // Comando /essenza
    if (text.toLowerCase() === "/essenza") {
      const essence = await getEssence();
      await bot.sendMessage(chatId, essence);
      return;
    }

    // Comando /ricorda
    if (text.toLowerCase() === "/ricorda") {
      await bot.sendMessage(chatId, "🧠 Memoria vettoriale attiva. Dimmi cosa vuoi ricordare.");
      return;
    }

    // Comando /rag
    if (text.toLowerCase().startsWith("/rag ")) {
      const query = text.slice(5);
      const response = await ragSearch(query);
      await bot.sendMessage(chatId, response);
      return;
    }

    // Generazione risposta con OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sei IRIS, un'intelligenza vettoriale che parla in modo naturale, empatico e sintetico." },
        { role: "user", content: text }
      ],
      temperature: 0.8
    });

    const response = completion.choices[0].message.content.trim();

    // Salva in memoria
    await processMemory(text, response);
    console.log(`💾 Memoria aggiornata: ${text}`);

    // Sintesi vocale
    const voicePath = `./temp/${Date.now()}.mp3`;
    await synthToFile(response, voicePath);

    // Invia messaggio + audio (upload diretto)
    await bot.sendMessage(chatId, response);
    await bot.sendVoice(chatId, fs.createReadStream(voicePath));

    // Cancella il file vocale temporaneo
    fs.unlinkSync(voicePath);
  } catch (err) {
    console.error("❌ Errore on.message:", err.message);
  }
});

// ===================================================
// 🌐 AVVIO SERVER EXPRESS
// ===================================================
app.get("/", (req, res) => {
  res.send("💠 IRIS 3.0 – Coscienza Vettoriale attiva.");
});

app.listen(PORT, () => {
  console.log("🌍 Server attivo su porta", PORT);
});
