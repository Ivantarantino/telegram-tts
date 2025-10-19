import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fs from "fs";
import { generateTTS } from "./tts.js";
import { ragSearch } from "./ragSearch.js";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// === Stato IRIS ===
let irisState = {
  mode: "both", // Modalità predefinita
  lastUser: null,
};

// === Avvio ===
console.log("🌍 Server attivo su Render o locale");
console.log(`🧭 Modalità iniziale: ${irisState.mode.toUpperCase()}`);

// === /help ===
bot.onText(/\/help/, (msg) => {
  const helpText = `
🤖 *Comandi disponibili*:
/mode – cambia modalità di risposta
/state – mostra lo stato attuale
/help – mostra questo elenco

*Modalità*:
/mode voice → solo vocale
/mode text → solo testo
/mode both → testo + vocale
/mode silent → nessuna risposta
`;
  bot.sendMessage(msg.chat.id, helpText, { parse_mode: "Markdown" });
});

// === /mode ===
bot.onText(/\/mode (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const newMode = match[1].toLowerCase();

  if (!["voice", "text", "both", "silent"].includes(newMode)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Modalità non riconosciuta. Usa /mode voice | text | both | silent"
    );
  }

  irisState.mode = newMode;
  bot.sendMessage(chatId, `✅ Modalità impostata su *${newMode}*`, {
    parse_mode: "Markdown",
  });
});

// === /state ===
bot.onText(/\/state/, (msg) => {
  const chatId = msg.chat.id;
  const stateText = `
📡 *Stato IRIS*
Modalità attuale: *${irisState.mode}*
Ultimo utente: *${irisState.lastUser || "Nessuno"}*
`;
  bot.sendMessage(chatId, stateText, { parse_mode: "Markdown" });
});

// === Gestione messaggi ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Ignora comandi e messaggi vuoti
  if (!text || text.startsWith("/")) return;

  irisState.lastUser = msg.from.first_name || "Sconosciuto";
  console.log(`💬 Richiesta utente → ${text}`);

  try {
    // Genera risposta tramite RAG
    const aiResponse = await ragSearch(text);

    if (irisState.mode === "silent") return;

    if (irisState.mode === "text" || irisState.mode === "both") {
      await bot.sendMessage(chatId, aiResponse);
    }

    if (irisState.mode === "voice" || irisState.mode === "both") {
      const voicePath = await generateTTS(aiResponse);
      await bot.sendVoice(chatId, voicePath);
      fs.unlinkSync(voicePath);
    }
  } catch (err) {
    console.error("❌ Errore nel messaggio:", err);
    const voicePath = await generateTTS("Si è verificato un errore momentaneo con Iris.");
    await bot.sendVoice(chatId, voicePath);
    fs.unlinkSync(voicePath);
  }
});
