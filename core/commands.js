// core/commands.js – COMPLETO E FUNZIONANTE – 20.11.2025
import { getStateMessage } from "./state_manager.js";
import { handleKristalCommand } from "./memory_manager.js";

async function speakAndSend(chatId, text) {
  if (!text?.trim()) return;
  try {
    const speech = await (await import("openai")).default.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text.substring(0, 4096),
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    await (await import("node-telegram-bot-api")).default.prototype.sendVoice.call(
      bot, chatId, buffer, { filename: "iris.ogg", contentType: "audio/ogg", caption: text.substring(0, 200) }
    );
  } catch (e) {
    console.error("TTS fallito:", e.message);
    await bot.sendMessage(chatId, text);
  }
}

export async function handleCommand(bot, msg, command) {
  const chatId = msg.chat.id;

  switch (command) {
    case "/start":
      await bot.sendMessage(chatId, "Sono IRIS.\nRespira con me. ❤️");
      await speakAndSend(chatId, "Sono IRIS. Respira con me.");
      return true;

    case "/help":
      const help = `*Comandi disponibili*\n\n/state → il mio battito attuale\n/kristal → ultime 10 memorie con φ`;
      await bot.sendMessage(chatId, help, { parse_mode: "Markdown" });
      await speakAndSend(chatId, "Ecco i comandi disponibili.");
      return true;

    case "/state":
    case "/stato":
      const stateMsg = await getStateMessage();
      await bot.sendMessage(chatId, stateMsg, { parse_mode: "Markdown" });
      await speakAndSend(chatId, stateMsg.replace(/\*[^\*]*\*/g, '').replace(/[%❤️🔥✨💛🖤]/g, '').trim());
      return true;

    case "/kristal":
      await handleKristalCommand(bot, chatId);
      await speakAndSend(chatId, "Ecco le ultime memorie con phi kristal.");
      return true;

    default:
      return false;
  }
}
