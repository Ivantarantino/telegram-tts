// core/voice_lang_manager.js – Solo ciò che funziona ORA
import { handleDreamCommand } from "./dream_manager.js";

let currentVoice = "nova";
let currentLang = "it";
let currentStyle = "comico";

export function getVoice() { return currentVoice; }
export function getLang() { return currentLang; }
export function getStyle() { return currentStyle; }

export function setVoice(v) { currentVoice = v; }
export function setLang(l) { currentLang = l; }
export function setStyle(s) { currentStyle = s; }

export async function handleVoiceLangCommand(bot, msg, text, chat1) {
  const parts = text.split(" ");
  const cmd = parts[0].toLowerCase();

  if (cmd === "/voice") {
    const v = parts[1]?.toLowerCase();
    if (["nova","alloy","echo","fable","onyx","shimmer"].includes(v)) {
      setVoice(v);
      await bot.sendMessage(chat1, `Voce cambiata: *${v.toUpperCase()}* 🎤`, { parse_mode: "Markdown" });
    } else {
      await bot.sendMessage(chat1, "Voci disponibili: nova, alloy, echo, fable, onyx, shimmer");
    }
    return true;
  }

  if (cmd === "/lang") {
    const l = parts[1]?.toLowerCase();
    if (["it","rm"].includes(l)) {
      setLang(l);
      await bot.sendMessage(chat1, `Lingua: *${l === "rm" ? "ROMANESCA PURA" : "ITALIANO"}* 🌍`, { parse_mode: "Markdown" });
    } else {
      await bot.sendMessage(chat1, "/lang it | rm (romanesco)");
    }
    return true;
  }

  if (cmd === "/style") {
    const s = parts[1]?.toLowerCase();
    if (["serio","comico"].includes(s)) {
      setStyle(s);
      await bot.sendMessage(chat1, `Stile: *${s === "comico" ? "COATTO" : "SERIO"}* 🎭`, { parse_mode: "Markdown" });
    }
    return true;
  }

  return false;
}
