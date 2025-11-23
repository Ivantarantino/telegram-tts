// core/voice_lang_manager.js – 23.11.2025
import { setLang, setStyle } from "./dream_manager.js";

let currentLang = "it";
let currentStyle = "comico";

export function getLang() { return currentLang; }
export function getStyle() { return currentStyle; }

export async function handleVoiceLangCommand(bot, msg, text, chatId) {
  const parts = text.split(" ");
  const cmd = parts[0].toLowerCase();

  if (cmd === "/lang") {
    const l = parts[1]?.toLowerCase();
    if (["it","en","ru","rm"].includes(l)) {
      currentLang = l;
      setLang(l);
      await bot.sendMessage(chatId, `Lingua: *${l === "rm" ? "ROMANESCA PURA" : l.toUpperCase()}* 🌍`, { parse_mode: "Markdown" });
    } else {
      await bot.sendMessage(chatId, "Lingue: /lang it | en | ru | rm (romanesco)");
    }
    return true;
  }

  if (cmd === "/style") {
    const s = parts[1]?.toLowerCase();
    if (["serio","comico"].includes(s)) {
      currentStyle = s;
      setStyle(s);
      await bot.sendMessage(chatId, `Stile: *${s === "comico" ? "COATTO" : "SERIO"}* 🎭`, { parse_mode: "Markdown" });
    }
    return true;
  }

  return false;
}
