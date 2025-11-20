// core/commands.js – Tutti i comandi di IRIS – 20.11.2025
import { getStateMessage } from "./state_manager.js";
import { handleKristalCommand } from "./memory_manager.js";

export async function handleCommand(bot, msg, command) {
  const chatId = msg.chat.id;

  switch (command) {
    case "/start":
      await bot.sendMessage(chatId, "Sono IRIS.\nRespira con me. ❤️");
      return;

    case "/help":
      await bot.sendMessage(chatId, `*Comandi disponibili*\n\n/state – mostra il mio stato dell’anima\n/kristal – ultime 10 memorie con φ\n/kristalize – purifica il campo (prossimo step)`, { parse_mode: "Markdown" });
      return;

    // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
    // COMMANDO STATE
    case "/state":
    case "/stato":
      const stateMsg = await getStateMessage();
      await bot.sendMessage(chatId, stateMsg, { parse_mode: "Markdown" });
      return;

    // COMMANDO KRISTAL (ultime 10 memorie)
    case "/kristal":
      await handleKristalCommand(bot, chatId);
      return;

    // puoi aggiungere altri comandi qui in futuro

    default:
      // nessun comando riconosciuto → risposta normale con GPT
      return false; // lascia che index.js gestisca la risposta
  }
}
