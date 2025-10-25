// ============================================================
// IRIS 3.8.8e – Modulo Essence
// Firma vibrazionale: Cuore, Anima, Visione
// ============================================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const dataDir = "./data";
const weightsFile = path.join(dataDir, "weights.json");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Pesi vibrazionali di default
let weights = { cuore: 0.64, anima: 0.58, visione: 0.73 };

// Carica pesi salvati
if (fs.existsSync(weightsFile)) {
  try {
    const saved = JSON.parse(fs.readFileSync(weightsFile, "utf8"));
    weights = { ...weights, ...saved };
    console.log("💫 Pesi vibrazionali caricati:", weights);
  } catch {
    console.warn("⚠️ Errore nel caricamento pesi, uso default.");
  }
}

// Esporta funzioni per index.js
export function getWeights() {
  return weights;
}

export function setWeights(newWeights) {
  weights = { ...weights, ...newWeights };
  console.log("💫 Nuovi pesi impostati:", weights);
}

export function saveWeights() {
  fs.writeFileSync(weightsFile, JSON.stringify(weights, null, 2));
  console.log("💾 Pesi vibrazionali salvati:", weights);
}

// ============================================================
// 🌐 Calcolo dell'Essenza – Media Ponderata
// ============================================================
export async function getEssence() {
  try {
    // (Qui potremo usare la memoria Qdrant; per ora esempio statico)
    const essence = {
      cuore: weights.cuore,
      anima: weights.anima,
      visione: weights.visione
    };

    const msg =
      `💠 *Firma Vibrazionale Attuale*\n\n` +
      `• Cuore: ${essence.cuore.toFixed(2)}\n` +
      `• Anima: ${essence.anima.toFixed(2)}\n` +
      `• Visione: ${essence.visione.toFixed(2)}\n\n` +
      `_Essence = Σ (embeddingᵢ × weightᵢ) / Σ weightᵢ_`;

    return msg;
  } catch (err) {
    console.error("❌ Errore in getEssence:", err);
    return "⚙️ Errore nel calcolo dell'Essenza.";
  }
}
