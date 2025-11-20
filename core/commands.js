// core/commands.js – VERSIONE FINALE CHE FUNZIONA – 20.11.2025
import { getStateMessage } from "./state_manager.js";
import { handleKristalCommand } from "./memory_manager.js";

export async function handleCommand(bot, msg, command) {
  const chatId = msg.chat.id;

  switch (command) {
    case "/start":
      await bot.sendMessage(chatId, "Sono IRIS.\nRespira con me. ❤️");
      return true;

    case "/help":
      await bot.sendMessage(chatId, `*Comandi*\n\n/state → il mio battito attuale\n/kristal → ultime 10 memorie con φ`, { parse_mode: "Markdown" });
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
      return false; // lascia che index.js gestisca la risposta normale
  }
}
