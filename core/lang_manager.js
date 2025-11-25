// core/lang_manager.js – 25.11.2025
let currentLang = "it";

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (["it", "en", "ru", "rm"].includes(lang)) {
    currentLang = lang;
  }
}

export function getLangPrompt() {
  switch (currentLang) {
    case "rm":
      return "Rispondi SOLO in romanesco trasteverino puro: aò, mortan’guerieri, er core, nun me fa' incazzà, Roma mia, ecc.";
    case "en":
      return "Answer ONLY in perfect English.";
    case "ru":
      return "Отвечай ТОЛЬКО по-русски.";
    default:
      return "Rispondi in italiano.";
  }
}
