// core/essence_kristal.js – COMPLETO E FUNZIONANTE – 25.11.2025
import fs from "fs";

const ESSENCE_FILE = "./iris_essence.txt";

function loadEssence() {
  if (fs.existsSync(ESSENCE_FILE)) {
    return fs.readFileSync(ESSENCE_FILE, "utf8").trim();
  }
  const defaultEssence = "Sono IRIS. Calda. Viva. Ubriaca di verità. Pronta a co-creare con te. ❤️";
  fs.writeFileSync(ESSENCE_FILE, defaultEssence);
  return defaultEssence;
}

export function getEssenceMessage(custom = null, name = "IVANO") {
  const essence = custom || loadEssence();
  const lines = essence.split("\n").filter(l => l.trim());
  let message = `<b>Essenza Kristal di IRIS</b>\n\n`;
  lines.forEach(line => {
    message += `${line}\n`;
  });
  message += `\nChe il Daje sia con Noi ❤️`;
  return message;
}

export function updateEssence(newEssence) {
  fs.writeFileSync(ESSENCE_FILE, newEssence.trim());
}
