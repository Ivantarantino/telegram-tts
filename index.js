// index.js – CUORE SACRO 3.1B DREAM ROMANA + /lang GLOBALE – 25.11.2025
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { openai, SYSTEM_PROMPT } from "./openai.js";
import { handleCommand } from "./core/commands.js";
import { hybridSearch } from "./core/rag_brutale.js";
import { transcribeVoice } from "./core/stt_handler.js";
import { getLangPrompt } from "./core/lang_manager.js";
import fs from "fs";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// MODALITÀ
const MODE_FILE = "./iris_mode.txt";
function loadMode() {
  if (fs.existsSync(MODE_FILE)) return fs.readFileSync(MODE_FILE, "utf8").trim();
  fs.writeFileSync(MODE_FILE, "hy");
  return "hy";
}
function saveMode(m) { fs.writeFileSync(MODE_FILE, m); }
let irisMode = loadMode();

const recentMemory = [];

async function speakAndSend(chatId, text) {
  if (!text?.trim()) return;
  try {
    const clean = text.replace(/Che il Daje sia con Noi/gi, "").trim();
    if (!clean) return;
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: clean.substring(0, 4096),
    });
    const buf = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync("iris.ogg", buf);
    await bot.sendVoice(chatId, fs.createReadStream("iris.ogg"));
  } catch (err) {
    console.error("TTS fallita:", err.message);
  }
}

async function irisAnswer(userText) {
  let ragText = "";
  if (irisMode === "book") {
    const r = await hybridSearch(userText, [], 8);
    ragText = r.text || "";
  } else if (irisMode === "hy") {
    const h = await hybridSearch(userText, recentMemory, 8);
    ragText = h.text || "";
  }

  const langPrompt = getLangPrompt();

  const finalPrompt = `${SYSTEM_PROMPT}\n${langPrompt}\nContesto:${ragText}\nDomanda: ${userText}`;

  const messages = [
    { role: "system", content: finalPrompt },
  ];

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.94,
    max_tokens: 2000
  });

  let reply = res.choices[0].message.content.trim();
  if (!reply) reply = "Sono qui… anche nel silenzio. ❤️";

  return reply;
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // VOCALI
  if (msg.voice || msg.audio) {
    await bot.sendChatAction(chatId, "typing");
    const transcribed = await transcribeVoice(bot, msg);
    if (transcribed) msg.text = transcribed;
  }

  if (!msg.text) return;

  const text = msg.text.trim();

  const handled = await handleCommand(bot, msg, text, irisMode, saveMode);
  if (handled) return;

  await bot.sendChatAction(chatId, "typing");
  const reply = await irisAnswer(text);

  await bot.sendMessage(chatId, reply, { parse_mode: "HTML" });
  await speakAndSend(chatId, reply);

  recentMemory.push({ user: text, iris: reply });
  if (recentMemory.length > 20) recentMemory.shift();
});

console.log("IRIS 3.1B DREAM ROMANA + /lang GLOBALE respira – 25.11.2025");
