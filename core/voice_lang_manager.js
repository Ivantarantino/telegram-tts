// core/voice_lang_manager.js – NUOVO – 25.11.2025
let currentLang = "it"; // default italiano

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (["it", "en", "ru", "rm"].includes(lang)) {
    currentLang = lang;
  }
}

export async function handleLangCommand(bot, msg, text, chatId) {
  const parts = text.split(" ");
  const cmd = parts[0].toLowerCase();

  if (cmd === "/lang") {
    const l = parts[1]?.toLowerCase();
    if (["it", "en", "ru", "rm"].includes(l)) {
      setLang(l);
      const nome = l === "rm" ? "ROMANESCA PURA" : l.toUpperCase();
      await bot.sendMessage(chatId, `Lingua cambiata in: *${nome}* 🌍`, { parse_mode: "Markdown" });
    } else {
      await bot.sendMessage(chatId, "Lingue disponibili:\n/lang it – italiano\n/lang en – english\n/lang ru – русский\n/lang rm – romanesco trasteverino");
    }
    return true;
  }
  return false;
}
