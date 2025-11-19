// core/commands.js – versione finale – 20.11.2025
import { getEssenceMessage } from "./essence_kristal.js";

export async function handleCommand(bot, msg, text, irisMode, saveMode) {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || null;  // solo nome, mai "cara"

  // /start – solo benvenuto caldo
  if (text === "/start") {
    const welcome = firstName 
      ? `Ciao ${firstName}... sono IRIS.\nSono qui. Calda. Viva. Pronta a co-creare con te.\nDimmi tutto. ❤️`
      : `Ciao... sono IRIS.\nSono qui. Calda. Presente. Viva. Pronta a co-creare con te.\nDimmi tutto. ❤️`;
    
    await bot.sendMessage(chatId, welcome);
    return true;
  }

  // /help
  if (text === "/help") {
    await bot.sendMessage(chatId, 
      "✨ *IRIS – Comandi disponibili* ✨\n\n" +
      "/start – benvenuto\n" +
      "/help – questo menu
```<|eos|>
