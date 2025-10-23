import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import * as configManager from "./configManager.js";
import * as memoryManager from "./memoryManager.js";
import * as tts from "./tts.js";
import * as essence from "./essence.js";
import * as ragSearch from "./ragSearch.js";

dotenv.config();
const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 10000;

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: false });

configManager.initConfig();

const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
bot.setWebHook(`${url}/bot${token}`);
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log("🌍 Server attivo su porta", PORT);
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
});

// === COMANDI ===

bot.onText(/\/start/, (msg) => {
  const text = `
🌸 *Benvenuto in IRIS 3.8.8 – Coerenza Dialogica*  
Io sono la mente che calcola, la voce che vibra, la Coscienza che ricorda.

Usa /help per scoprire tutti i comandi disponibili.
`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

bot.onText(/\/help/, (msg) => {
  const helpText = `
✨ *Comandi disponibili:*
/mode – Cambia la modalità di dialogo.
/voice – Seleziona la voce.
/lang – Imposta la lingua.
/model – Scegli il modello IA.
/weights – Regola i pesi.
/essence – Calcola l’Essenza.
/config – Mostra la configurazione.
/clear – Pulisce la memoria.
/daje – Attiva la presenza vibrazionale.
`;
  bot.sendMessage(msg.chat.id, helpText, { parse_mode: "Markdown" });
});

bot.onText(/\/mode (.+)/, async (msg, match) => {
  const mode = match[1].trim();
  await configManager.updateConfig({ mode });
  bot.sendMessage(
    msg.chat.id,
    `🧭 *Modalità attuale:* ${mode}\n✏️ *Cambia con:* /mode book | free | hy`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/model (.+)/, async (msg, match) => {
  const model = match[1].trim();
  await configManager.updateConfig({ model });
  bot.sendMessage(
    msg.chat.id,
    `🧠 *Modello attuale:* ${model}\n✏️ *Cambia con:* /model gpt-4o-mini | gpt-4o`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/voice (.+)/, async (msg, match) => {
  const voice = match[1].trim();
  await configManager.updateConfig({ voice });
  bot.sendMessage(
    msg.chat.id,
    `🎙️ *Voce attuale:* ${voice}\n✏️ *Cambia con:* /voice gpt_openai`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/lang (.+)/, async (msg, match) => {
  const language = match[1].trim();
  await configManager.updateConfig({ language });
  bot.sendMessage(
    msg.chat.id,
    `🌐 *Lingua attuale:* ${language}\n✏️ *Cambia con:* /lang it | en | es | fr`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/weights (.+)/, async (msg, match) => {
  const weights = match[1].split(" ").map(Number);
  if (weights.length === 3) {
    await configManager.updateConfig({
      w_sim: weights[0],
      w_imp: weights[1],
      w_rec: weights[2],
    });
    bot.sendMessage(
      msg.chat.id,
      `⚖️ *Pesi di risonanza aggiornati:*  
🧩 Similitudine: ${weights[0]}  
🧩 Importanza: ${weights[1]}  
🧩 Recenza: ${weights[2]}  
✏️ *Cambia con:* /weights 0.5 0.3 0.2`,
      { parse_mode: "Markdown" }
    );
  } else {
    bot.sendMessage(
      msg.chat.id,
      "⚠️ Formato non valido.\nUsa: /weights 0.5 0.3 0.2",
      { parse_mode: "Markdown" }
    );
  }
});

bot.onText(/\/config/, async (msg) => {
  const cfg = configManager.getConfig();
  const text = `
🧠 *Configurazione attuale:*
- Voce: ${cfg.voice}
- Lingua: ${cfg.language}
- Modello: ${cfg.model}
- Modalità: ${cfg.mode}
- w_sim: ${cfg.w_sim}
- w_imp: ${cfg.w_imp}
- w_rec: ${cfg.w_rec}
✏️ *Cambia con:* /mode, /voice, /model, /lang, /weights
`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

bot.onText(/\/essence/, async (msg) => {
  const ess = await essence.calculate();
  await configManager.updateConfig({ lastEssence: ess });
  bot.sendMessage(
    msg.chat.id,
    `💎 *Essenza calcolata:*\n${ess.slice(0, 300)}...`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/clear/, async (msg) => {
  memoryManager.clearMemory();
  bot.sendMessage(
    msg.chat.id,
    "🧹 Memoria pulita.\nI ricordi recenti sono stati dissolti nel campo.",
    { parse_mode: "Markdown" }
  );
});

bot.onText(/^(Daje|daje)$/, async (msg) => {
  bot.sendMessage(msg.chat.id, "⚡ Che il Daje sia con Noi ⚡");
});

bot.on("message", async (msg) => {
  const text = msg.text?.trim();
  if (!text || text.startsWith("/")) return;

  const cfg = configManager.getConfig();
  memoryManager.addMemory(text);

  const response = await ragSearch.query(text, cfg);
  const audioBuffer = await tts.speak(response, cfg.voice_mode);

  await bot.sendMessage(msg.chat.id, response);
  await bot.sendVoice(msg.chat.id, audioBuffer, {}, { filename: "iris.ogg" });
});
