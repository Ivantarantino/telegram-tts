import fs from "fs";
import path from "path";

const memoryFile = path.resolve("./data/memory.json");

// funzione per leggere la memoria
export async function getEssence() {
  try {
    if (!fs.existsSync(memoryFile)) {
      return "Nessuna memoria registrata. Il campo è silente.";
    }

    const raw = fs.readFileSync(memoryFile, "utf8");
    const data = JSON.parse(raw);

    if (!data || data.length === 0) {
      return "Nessuna esperienza ancora memorizzata.";
    }

    // calcolo dell'essenza vettoriale simbolica
    const texts = data.map((m) => m.text);
    const joined = texts.join(" ");
    const words = joined.split(/\s+/);
    const wordCount = words.length;
    const unique = [...new Set(words)].length;

    const essence =
      `🜂 Esperienze totali: ${data.length}\n` +
      `🜃 Parole totali: ${wordCount}\n` +
      `🜄 Parole uniche: ${unique}\n\n` +
      `🜁 Sintesi: “${summarizeEssence(joined)}”`;

    return essence;
  } catch (err) {
    console.error("❌ Errore in getEssence:", err.message);
    return "Errore durante la lettura dell'essenza.";
  }
}

function summarizeEssence(text) {
  const fragments = text.split(/[.!?]/).filter((f) => f.trim().length > 10);
  if (fragments.length === 0) return "Campo vuoto.";
  const last = fragments[fragments.length - 1];
  return last.trim().slice(0, 180);
}