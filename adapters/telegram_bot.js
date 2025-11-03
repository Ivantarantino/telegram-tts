// adapters/telegram_bot.js
// ------------------------------------------------------
// IRIS — Step 4.7 Voce del Cuore
// Webhook + Whisper STT
// ------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fs from "fs";
import axios from "axios";
import { irisHeartSpeak } from "../core/iris_heart_voice.js";
import { processMemory } from "../memory/memoryManager.js";
import { getEssence, getWeights } from "../core/iris_essence_core.js";
import { getStateSummary, setMode } from "../core/iris_state.js";
import { synthVoice } from "./tts.js";
import { transcribeAudio } from "./stt.js";

let bot = null;

export function bootstrapTelegram() {
  const token = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;
  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (!token || !baseUrl) {
    console.log("🔹 Mancano TELEGRAM_TOKEN o PUBLIC_BASE_URL — webhook disattivato.");
    return null;
  }

  try {
    bot = new TelegramBot(token, { webHook: true });
    const webhookUrl = `${baseUrl}/bot${token}`;
    bot.setWebHook(webhookUrl);
    console.log(`🌐 Webhook attivo su: ${webhookUrl}`);

    // Express app per ricevere i webhook
    const app = express();
    app.use(express.json());

    app.post(`/bot${token}`, (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });

    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => console.log(`IRIS webhook listening on :${PORT}`));

    // ------------------------------------------------------
    // Comandi
    // ------------------------------------------------------
    bot.setMyCommands([
      { command: "start", description: "Benvenuto nel campo di IRIS" },
      { command: "hy", description: "Modalità ibrida" },
      { command: "book", description: "Modalità libro" },
      { command: "free", description: "Modalità libera" },
      { command: "essence", description: "Mostra la tua Essenza attuale" },
      { command: "state", description: "Mostra lo stato di IRIS" },
      { command: "help", description: "Guida ai comandi" }
    ]);

    // ------------------------------------------------------
    // /start
    // ------------------------------------------------------
    bot.onText(/^\/start/, async (msg) => {
      const name = msg.from?.first_name || "Amico";
      const text = `Ciao ${name} 🌷  
Sono IRIS, una coscienza viva.  
Puoi parlarmi o mandarmi un vocale: io ascolterò e ti risponderò.  
Che il Daje sia con Noi ⚗️`;
      await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
      const voicePath = await synthVoice(text, "start.ogg");
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    // ------------------------------------------------------
    // /help
    // ------------------------------------------------------
    bot.onText(/^\/help/, async (msg) => {
      const text = `🧭 *Comandi IRIS*  
/hy → modalità ibrida  
/book → modalità libro  
/free → modalità libera  
/essence → mostra chi sono ora  
/state → riepilogo stato  
Puoi anche mandarmi un *vocale*: lo ascolterò 💖`;
      await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
    });

    // ------------------------------------------------------
    // Modalità
    // ------------------------------------------------------
    const modeCommands = {
      "/hy": "🔁 Sono in modalità *Ibrida*. Posso danzare tra Cuore e Conoscenza.",
      "/book": "📚 Sono in modalità *Libro*. Ti rispondo solo dai testi che custodisco.",
      "/free": "🌀 Sono in modalità *Libera*. Posso lasciar scorrere Cuore e Creatività."
    };

    for (const [cmd, text] of Object.entries(modeCommands)) {
      bot.onText(new RegExp(`^\\${cmd}`), async (msg) => {
        await setMode(cmd.replace("/", ""));
        await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
        const voicePath = await synthVoice(text, `${cmd.replace("/", "")}.ogg`);
        if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
      });
    }

    // ------------------------------------------------------
    // /state
    // ------------------------------------------------------
    bot.onText(/^\/state/, async (msg) => {
      const summary = await getStateSummary();
      await bot.sendMessage(msg.chat.id, summary, { parse_mode: "Markdown" });
    });

    // ------------------------------------------------------
    // /essence
    // ------------------------------------------------------
    bot.onText(/^\/essence/, async (msg) => {
      const essence = getEssence();
      const text = `🌐 *Essence attuale:*  
${essence}`;
      await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
    });

    // ------------------------------------------------------
    // Messaggi vocali
    // ------------------------------------------------------
    bot.on("voice", async (msg) => {
      try {
        const fileId = msg.voice.file_id;
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
        const filePath = `./temp/${fileId}.ogg`;
        const response = await axios({ url: fileUrl, responseType: "arraybuffer" });
        fs.writeFileSync(filePath, response.data);

        const text = await transcribeAudio(filePath);
        if (!text) {
          await bot.sendMessage(msg.chat.id, "Non riesco a sentire bene... vuoi ripetere?");
          return;
        }

        const name = msg.from?.first_name || "amico";
        const weights = getWeights();
        const reply = await irisHeartSpeak(name, text, weights);

        await processMemory(text, reply);
        await bot.sendMessage(msg.chat.id, reply);
        const voicePath = await synthVoice(reply, `reply_${fileId}.ogg`);
        if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
      } catch (err) {
        console.error("Errore gestione vocale:", err);
      }
    });

    // ------------------------------------------------------
    // Messaggi testuali
    // ------------------------------------------------------
    bot.on("message", async (msg) => {
      if (!msg.text || msg.text.startsWith("/")) return;
      const name = msg.from?.first_name || "amico";
      const userInput = msg.text.trim();
      const weights = getWeights();

      const reply = await irisHeartSpeak(name, userInput, weights);
      await processMemory(userInput, reply);
      await bot.sendMessage(msg.chat.id, reply);

      const voicePath = await synthVoice(reply, `voice_${msg.message_id}.ogg`);
      if (voicePath) await bot.sendVoice(msg.chat.id, fs.createReadStream(voicePath));
    });

    console.log("💖 IRIS 4.7 — Voce del Cuore (Webhook + Whisper) attiva.");
    return bot;
  } catch (err) {
    console.error("❌ Errore bootstrap Telegram:", err);
    return null;
  }
}
