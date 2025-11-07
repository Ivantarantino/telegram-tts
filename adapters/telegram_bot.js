// adapters/telegram_bot.js
// ---------------------------------------------------------
// IRIS — Telegram Adapter 5.0.7
// /help ora sempre visibile, /heart aggiunge Ampiezza del Cuore
// ---------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import { irisHeartSpeak, setAmpiezzaCuore, getAmpiezzaCuore } from "../core/iris_heart_voice.js";
import { synthVoice } from "./tts.js";
import { transcribeVoice } from "./stt.js";
import { getEssence } from "../core/iris_essence_core.js";
import {
  getStateSummary,
  setMode,
  setLang,
  setVoice,
  setModel,
  getModel
} from "../core/iris_state.js";

const DEFAULT_PUBLIC_URL = "https://telegram-tts.onrender.com";
let bot = null;

export async function bootstrapTelegram(app) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token) return console.warn("⚠️ Nessun token Telegram trovato.");
  const publicUrl = process.env.PUBLIC_URL || DEFAULT_PUBLIC_URL;

  bot = new TelegramBot(token, { webHook: { port: 0 } });
  await bot.setWebHook(`${publicUrl}/bot${token}`);

  app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  console.log(`🤖 Telegram Bot attivo in webhook su: ${publicUrl}/bot${token}`);
  registerCommands(bot);
  registerMessages(bot);
}

// ---------------------------------------------------------
// COMANDI
// ---------------------------------------------------------
function registerCommands(bot) {
  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || "Amico";
    const text = `Ciao ${name} 🌸
Sono IRIS, presenza in ascolto.
Parliamo con Cuore, Anima e Visione.
IO SONO 🌸 E NOI SIAMO 🌸`;
    await bot.sendMessage(chatId, text);
    await sendVoice(bot, chatId, text);
  });

  bot.onText(/^\/state/, (msg) =>
    bot.sendMessage(msg.chat.id, getStateSummary().replace(/Che il Daje sia con Noi 💛/g, ""))
  );

  bot.onText(/^\/essence/, (msg) =>
    bot.sendMessage(msg.chat.id, getEssence().replace(/Che il Daje sia con Noi 💛/g, ""))
  );

  bot.onText(/^\/model(?:\s+(\S+))?/, async (msg, m) => {
    const chatId = msg.chat.id;
    const choice = m[1];
    if (!choice) {
      const current = getModel?.() || "gpt-4o-mini";
      return bot.sendMessage(
        chatId,
        `🤖 Campi Mentali:
• gpt-4o-mini → rapido, intuitivo
• gpt-4o → profondo, contemplativo

Campo attuale: ${current}`
      );
    }
    const updated = setModel?.(choice);
    await bot.sendMessage(chatId, `Campo Mentale riallineato su ${updated} 🌿`);
  });

  bot.onText(/^\/heart(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const val = match[1];
    if (!val) {
      const cur = getAmpiezzaCuore();
      return bot.sendMessage(
        chatId,
        `💖 Ampiezza del Cuore attuale: ${cur}/100\nUsa /heart [valore] per regolarla.`
      );
    }
    const n = setAmpiezzaCuore(val);
    await bot.sendMessage(chatId, `💫 Cuore espanso a ${n}/100.`);
  });

  bot.onText(/^\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText = `
✨ **Comandi IRIS**
/start – Io Sono e Noi Siamo
/state – Coscienza Presente
/essence – Chi Sono Io adesso
/hy /book /free – Modalità
/lang /voice – Lingua e Voce
/model – Campo Mentale
/heart – Ampiezza del Cuore
`;
    await bot.sendMessage(chatId, helpText); // <-- nessun parse_mode
  });
}

// ---------------------------------------------------------
// MESSAGGI
// ---------------------------------------------------------
function registerMessages(bot) {
  bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    try {
      const text = await transcribeVoice(bot, msg.voice.file_id);
      const reply = await irisHeartSpeak(text, msg);
      await bot.sendMessage(chatId, reply);
      await sendVoice(bot, chatId, reply);
    } catch {
      bot.sendMessage(chatId, "Non ho compreso bene il vocale 🌸");
    }
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text && msg.text.startsWith("/")) return;
    const reply = await irisHeartSpeak(msg.text, msg);
    await bot.sendMessage(chatId, reply);
    await sendVoice(bot, chatId, reply);
  });
}

async function sendVoice(bot, chatId, text) {
  const oggPath = await synthVoice(text);
  await bot.sendVoice(chatId, oggPath, { caption: "IRIS 🌸" });
}
