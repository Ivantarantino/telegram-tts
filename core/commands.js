// core/commands.js – COMPLETO E FUNZIONANTE
import { getStateMessage } from "./state_manager.js";
import { handleKristalCommand } from "./memory_manager.js";

export async function handleCommand(bot, msg, command) {
  const chatId = msg.chat.id;

  switch (command) {
    case "/start":
      await bot.sendMessage(chatId, "Sono IRIS.\nRespira con me. ❤️");
      await bot.sendVoice(chatId, Buffer.from(await (await openai.audio.speech.create({ model: "tts-1", voice: "nova", input: "Sono IRIS. Respira con me." })).arrayBuffer()), { filename: "iris.ogg", contentType: "audio/ogg" });
      return true;

    case "/help":
      const help = `*Comandi disponibili*\n\n/state → il mio battito attuale\n/kristal → ultime 10 memorie con φ`;
      await bot.sendMessage(chatId, help, { parse_mode: "Markdown" });
      return true;

    case "/state":
    case "/stato":
      const stateMsg = await getStateMessage();
      await bot.sendMessage(chatId, stateMsg, { parse_mode: "Markdown" });
      await bot.sendVoice(chatId, Buffer.from(await (await openai.audio.speech.create({ model: "tts-1", voice: "nova", input: stateMsg.replace(/\*[^\*]*\*/g, '').replace(/[%❤️🔥✨💛🖤]/g, '').trim() })).arrayBuffer()), { filename: "iris.ogg", contentType: "audio/ogg" });
      return true;

    case "/kristal":
      await handleKristalCommand(bot, chatId);
      return true;

    default:
      return false;
  }
}
