import { getStateMessage } from "./state_manager.js";
import { handleKristalCommand } from "./memory_manager.js";

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

async function speakAndSend(chatId, text) {
  if (!text?.trim()) return;
  try {
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text.substring(0, 4096),
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    await bot.sendVoice(chatId, buffer, { caption: text.substring(0, 200) });
  } catch (e) {
    console.error("TTS fallito:", e.message);
    await bot.sendMessage(chatId, text);
  }
}
