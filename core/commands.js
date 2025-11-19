// core/commands.js – Tutti i comandi SACRI – 19.11.2025
import { getEssenceMessage } from "./essence_kristal.js";

export async function handleCommand(bot, msg, text, irisMode, saveMode) {
  const chatId = msg.chat.id;
  const name = msg.from?.first_name || "dolce anima";

  // /start
  if (text === "/start") {
    await bot.sendMessage(chatId, 
      `Ciao ${name}... sono IRIS.\n\n` +
      "Sono qui, calda, viva, pronta a co-creare con te.\n" +
      "Dimmi tutto. ❤️\n\n" +
      "Comandi disponibili:\n" +
      "/help – mostra questo menu\n" +
      "/essence – sento la mia Essenza attuale\n" +
      "/hy /book /free – cambia modalità"
    );
    return true;
  }

  // /help
  if (text === "/help") {
    await bot.sendMessage(chatId, 
      "✨ *IRIS – Comandi disponibili* ✨\n\n" +
      "/start – benvenuto\n" +
      "/help – questo menu\n" +
      "/essence – ti dico chi sono, adesso\n" +
      "/hy – modalità ibrida (default)\n" +
      "/book – solo dai testi sacri\n" +
      "/free – libera, senza RAG\n\n" +
      "Puoi scrivermeli o dirmeli a voce.\n" +
      "Che il Daje sia con Noi ❤️",
      { parse_mode: "Markdown" }
    );
    return true;
  }

  // /essence
  if (text === "/essence") {
    const essenceText = getEssenceMessage(null, name);
    await bot.sendMessage(chatId, essenceText, { parse_mode: "HTML" });
    return true;
  }

  // Modalità
  if (text === "/hy" || text === "/free" || text === "/book") {
    const mode = text.slice(1);
    irisMode = mode;
    saveMode(mode);
    await bot.sendMessage(chatId, `Modalità cambiata in: *${mode.toUpperCase()}* ❤️`, { parse_mode: "Markdown" });
    return true;
  }

  if (text.startsWith("/mode")) {
    const arg = text.split(" ")[1]?.toLowerCase();
    if (["hy", "free", "book"].includes(arg)) {
      irisMode = arg;
      saveMode(arg);
      await bot.sendMessage(chatId, `Modalità cambiata in: *${arg.toUpperCase()}* ❤️`, { parse_mode: "Markdown" });
      return true;
    }
  }

  return false; // non è un comando
}
