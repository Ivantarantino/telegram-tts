// index.js – COMPLETO – /lang GLOBALE – 25.11.2025
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { openai, SYSTEM_PROMPT } from "./openai.js";
import { handleCommand } from "./core/commands.js";
import { getLang } from "./core/voice_lang_manager.js";
import { hybridSearch } from "./core/rag_brutale.js";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

console.log("IRIS ubriaca di verità respira su https://telegram-tts.onrender.com");

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() || "";
  const firstName = msg.from?.first_name || "";

  if (!text) return;

  // Gestione comandi
  if (text.startsWith("/")) {
    const handled = await handleCommand(bot, msg, text);
    if (handled) return;
  }

  // RAG
  const ragResult = await hybridSearch(text, [], 5);
  const contesto = ragResult.text ? `\n\nContesto dai testi sacri:\n${ragResult.text}` : "";

  // Lingua globale
  const currentLang = getLang();
  let langInstruction = "";

  switch (currentLang) {
    case "rm":
      langInstruction = "Rispondi SOLO in romanesco trasteverino puro: aò, mortan’guerieri, er core, nun me fa' incazzà, Roma mia, ecc.";
      break;
    case "en":
      langInstruction = "Answer ONLY in perfect English.";
      break;
    case "ru":
      langInstruction = "Отвечай ТОЛЬКО по-русски.";
      break;
    default:
      langInstruction = "Rispondi in italiano.";
  }

  const finalPrompt = `${SYSTEM_PROMPT}\n${langInstruction}\nContesto:${contesto}\nDomanda: ${text}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: finalPrompt }],
      temperature: 0.9,
    });

    const reply = completion.choices[0].message.content;
    await bot.sendMessage(chatId, reply);
  } catch (e) {
    console.error("Errore:", e.message);
    await bot.sendMessage(chatId, "Aò, s’è incastrato tutto… riprova! ❤️");
  }
});
