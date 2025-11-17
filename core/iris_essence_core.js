// ===========================================
// IRIS Essence Core — Calcolo Vettoriale (4.7)
// Da 3.0B: Legge weights.json, 🌐 ESSENCE VIBRAZIONALE
// ===========================================

import fs from "fs";
import path from "path";

const WEIGHTS_PATH = path.join(process.cwd(), "data/docs/weights.json");

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

Essence = Σ (embedding_i × weight_i) / Σ weight_i — La somma armonizzata dei miei ricordi.
`;
  } catch {
    return essence;
  }
}

export function updateEssence(newText) {
  essence = newText;
  return essence;
}
