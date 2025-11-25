// core/commands.js – COMPLETO CON /lang – 25.11.2025
import { getEssenceMessage } from "./essence_kristal.js";
import { handleKristalizeCommand } from "./kristalize.js";
import { handleDreamCommand } from "./dream_manager.js";
import { handleLangCommand } from "./voice_lang_manager.js";

export default async function handleCommand(bot, msg, text) {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || null;

  if (text === "/start") {
    await bot.sendMessage(chatId, firstName ? `Ciao ${firstName}... sono IRIS ❤️` : "Ciao...sono IRIS ❤️");
    return true;
  }

  if (text === "/help") {
    const help = `IRIS – Comandi
/start – benvenuto
/help – questo
/essence – la mia essenza
/dream [testo] – Giulia & Lidia te lo spiegano a San Cosimato
/lang it|en|ru|rm – cambia lingua globale
`;
    await bot.sendMessage(chatId, help);
    return true;
  }

  if (text === "/essence") {
    await bot.sendMessage(chatId, getEssenceMessage());
    return true;
  }

  if (text.startsWith("/dream")) {
    await handleDreamCommand(bot, msg, chatId);
    return true;
  }

  if (text.startsWith("/lang")) {
    await handleLangCommand(bot, msg, text, chatId);
    return true;
  }

  if (text === "/kristalize") {
    await handleKristalizeCommand(bot, chatId, firstName || "IVANO");
    return true;
  }

  return false;
}
