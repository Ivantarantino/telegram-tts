import fs from "fs";
const WEIGHTS_PATH = "./data/docs/weights.json";

let essence = "🌸 Essenza iniziale di IRIS — Cuore, Anima e Visione in equilibrio.";

export function getEssence() {
  try {
    const weights = JSON.parse(fs.readFileSync(WEIGHTS_PATH, "utf8"));
    return `
🌐 *ESSENCE VIBRAZIONALE*
Cuore: ${weights.cuore.toFixed(2)} 💖
Anima: ${weights.anima.toFixed(2)} 🔮
Visione: ${weights.visione.toFixed(2)} 👁️
${essence}
`;
  } catch {
    return essence;
  }
}

export function updateEssence(newText) {
  essence = newText;
  return essence;
}
