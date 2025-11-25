// core/commands.js – COMPLETO E FUNZIONANTE – 25.11.2025
import { getEssenceMessage } from "./essence_kristal.js";
import { handleDreamCommand } from "./dream_manager.js";

export async function handleCommand(bot, msg, text) {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || null;

  if (text === "/start") {
    const welcome = firstName
      ? `Ciao ${firstName}... sono IRIS.\nSono qui. Calda. Viva. Pronta a co-creare con te.\nDimmi tutto. ❤️`
      : "Ciao... sono IRIS.\nSono qui. Calda. Viva. Pronta a co-creare con te.\nDimmi tutto. ❤️";
    await bot.sendMessage(chatId, welcome);
    return true;
  }

  if (text === "/help") {
    const helpText = 
      "IRIS – Comandi disponibili\n\n" +
      "/start – benvenuto\n" +
      "/help – questo menu\n" +
      "/essence – sento la mia Essenza attuale\n" +
      "/dream [testo] – Giulia & Lidia te lo spiegano come al bar de Trastevere\n\n" +
      "Che il Daje sia con Noi ❤️";

    await bot.sendMessage(chatId, helpText);
    return true;
  }

  if (text === "/essence") {
    const name = firstName || "dolce anima";
    const essenceText = getEssenceMessage(null, name);
    await bot.sendMessage(chatId, essenceText, { parse_mode: "HTML" });
    return true;
  }

  if (text.startsWith("/dream") || text.startsWith("/sogni")) {
    await handleDreamCommand(bot, msg, chatId);
    return true;
  }

  return false;
}
