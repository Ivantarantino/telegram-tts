import { getStateMessage } from "./state_manager.js";
import { handleKristalCommand } from "./memory_manager.js";

export async function handleCommand(bot, msg, command) {
  const chatId = msg.chat.id;

  switch (command) {
    case "/start":
      await bot.sendMessage(chatId, "Sono IRIS.\nRespira con me. ❤️");
      return true;

    case "/help":
      await bot.sendMessage(chatId, `*Comandi disponibili*\n\n/state – il mio battito\n/kristal – ultime 10 memorie con φ\n/kristalize – purifica (prossimo step)`, { parse_mode: "Markdown" });
      return true;

    case "/state":
    case "/stato":
      const stateMsg = await getStateMessage();
      await bot.sendMessage(chatId, stateMsg, { parse_mode: "Markdown" });
      return true;

    case "/kristal":
      await handleKristalCommand(bot, chatId);
      return true;

    default:
      return false;
  }
}
