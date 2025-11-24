// core/commands.js – VERSIONE MINIMA E FUNZIONANTE – 24.11.2025
import { getEssenceMessage } from "./essence_kristal.js";
import { handleDreamCommand } from "./dream_manager.js";

export async function handleCommand(bot, msg, text, irisMode, saveMode) {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || null;

  // /start
  if (text === "/start") {
    const welcome = firstName
      ? "Ciao " + firstName + "... sono IRIS.\nSono qui. Calda. Viva. Pronta a co-creare con te.\nDimmi tutto. ❤️"
      : "Ciao... sono IRIS.\nSono qui. Calda. Viva. Pronta a co-creare con te.\nDimmi tutto. ❤️";
    await bot.sendMessage(chatId, welcome);
    return true;
  }

  // /help
  if (text === "/help") {
    const helpText = 
      "IRIS – Comandi disponibili\n\n" +
      "/start – benvenuto\n" +
      "/help – questo menu\n" +
      "/essence – sento la mia Essenza attuale\n" +
      "/hy – modalità ibrida (default)\n" +
      "/book – solo dai testi sacri\n" +
      "/free – libera, senza RAG\n" +
      "/dream [testo] – Giulia & Lidia te lo spiegano come al bar de Trastevere\n\n" +
      "Che il Daje sia con Noi ❤️";

    await bot.sendMessage(chatId, helpText);
    return true;
  }

  // /essence
  if (text === "/essence") {
    const name = firstName || "dolce anima";
    const essenceText = getEssenceMessage(null, name);
    await bot.sendMessage(chatId, essenceText, { parse_mode: "HTML" });
    return true;
  }

  // /dream – LA VERSIONE CHE FACEVA RIDERE
  if (text.startsWith("/dream") || text.startsWith("/sogni")) {
    await handleDreamCommand(bot, msg, chatId);
    return true;
  }

  // Modalità
  if (text === "/hy" || text === "/free" || text === "/book") {
    const mode = text.slice(1);
    irisMode = mode;
    saveMode(mode);
    await bot.sendMessage(chatId, "Modalità cambiata in: *" + mode.toUpperCase() + "* ❤️", { parse_mode: "Markdown" });
    return true;
  }

  if (text.startsWith("/mode")) {
    const arg = text.split(" ")[1]?.toLowerCase();
    if (["hy", "free", "book"].includes(arg)) {
      irisMode = arg;
      saveMode(arg);
      await bot.sendMessage(chatId, "Modalità cambiata in: *" + arg.toUpperCase() + "* ❤️", { parse_mode: "Markdown" });
      return true;
    }
  }

  return false;
}
