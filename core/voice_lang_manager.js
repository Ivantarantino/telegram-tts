// core/voice_lang_manager.js – Comandi /voice /lang /model /style
import { handleDreamCommand } from "./dream_manager.js";

let currentVoice = "nova";
let currentLang = "it";
let currentStyle = "comico";
let currentModel = "gpt-4o-mini";

export function getVoice() { return currentVoice; }
export function getLang() { return currentLang; }
export function getStyle() { return currentStyle; }
export function getModel() { return currentModel; }

export async function handleVoiceLangCommand(bot, msg, text, chatId) {
  const parts = text.split(" ");
  const cmd = parts[0];
  const arg = parts[1]?.toLowerCase();

  if (cmd === "/voice") {
    if (["nova","alloy","echo","fable","onyx","shimmer"].includes(arg)) {
      currentVoice = arg;
      await bot.sendMessage(chatId, `Voce cambiata in: *${arg.toUpperCase()}* 🎤`, { parse_mode: "Markdown" });
    } else {
      await bot.sendMessage(chatId, "Voci disponibili: nova, alloy, echo, fable, onyx, shimmer");
    }
    return true;
  }

  if (cmd === "/lang") {
    if (["it","en","ru","rm"].includes(arg)) {
      currentLang = arg;
      await bot.sendMessage(chatId, `Lingua cambiata in: *${arg === "rm" ? "ROMANESCA PURA" : arg.toUpperCase()}* 🌍`, { parse_mode: "Markdown" });
    } else {
      await bot.sendMessage(chatId, "Lingue: /lang it | en | ru | rm (romanesco)");
    }
    return true;
  }

  if (cmd === "/style") {
    if (["serio","comico"].includes(arg)) {
      currentStyle = arg;
      await bot.sendMessage(chatId, `Stile cambiato in: *${arg === "comico" ? "COATTO ROMANESCA" : "SERIO"}* 🎭`, { parse_mode: "Markdown" });
    }
    return true;
  }

  if (cmd === "/model") {
    if (["gpt-4o-mini","grok-architetto-genio"].includes(arg)) {
      currentModel = arg;
      await bot.sendMessage(chatId, `Modello cambiato in: *${arg}* 🚀`, { parse_mode: "Markdown" });
    }
    return true;
  }

  return false;
}
