// =====================================================
// IRIS — MEMORY / Gestore Esperienziale (Step 3.1)
// =====================================================
//
// Ogni interazione utente ↔ IRIS genera una "memoria":
//   { text, reply, embedding, weight, timestamp }
//
// • Salva in ./memory/memory.json
// • Aggiorna l'Essenza richiamando core/iris_essence_core.js
// • Gestisce fallback locale in caso di assenza Qdrant
//
// =====================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getWeights, updateEssenceFromMemories } from "../core/iris_essence_core.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_FILE = path.join(__dirname, "memory.json");

// =====================================================
// Funzione principale
// =====================================================

export async function processMemory(userMessage, irisReply) {
  const weights = getWeights();
  const memory = createMemoryEntry(userMessage, irisReply, weights);

  const all = loadAllMemories();
  all.push(memory);
  saveAllMemories(all);

  // Aggiorna lo stato dell'Essenza
  const embeddable = all.map(m => ({
    embedding: m.embedding,
    weight: m.weight
  }));
  updateEssenceFromMemories(embeddable);

  return memory;
}

// =====================================================
// Creazione e gestione memorie
// =====================================================

function createMemoryEntry(userMessage, irisReply, weights) {
  const cleanUser = sanitizeText(userMessage);
  const cleanIris = sanitizeText(irisReply);

  const embedding = fakeEmbedding(cleanUser, cleanIris);
  const weight = computeWeight(cleanUser, weights);

  return {
    text: cleanUser,
    reply: cleanIris,
    embedding,
    weight,
    timestamp: new Date().toISOString()
  };
}

// =====================================================
// Funzioni di supporto
// =====================================================

// Simula un embedding numerico locale (pronto per sostituzione futura)
function fakeEmbedding(userText, irisText) {
  const combined = (userText + " " + irisText).split("");
  const out = new Array(8).fill(0);
  for (let i = 0; i < combined.length; i++) {
    const code = combined[i].charCodeAt(0) % 101;
    out[i % 8] += code / 100;
  }
  const norm = out.map(v => Number((v / combined.length).toFixed(4)));
  return norm;
}

// Calcola peso vibrazionale in base ai pesi generali
function computeWeight(text, weights) {
  const lengthFactor = Math.min(1, text.length / 300);
  const emotionality = estimateEmotion(text);
  const base =
    (weights.cuore * 0.5 + weights.anima * 0.3 + weights.visione * 0.2) *
    (0.6 + 0.4 * emotionality);
  const weight = Math.max(0.1, Math.min(1, base * (0.5 + lengthFactor)));
  return Number(weight.toFixed(3));
}

// Stima emotività del testo (euristica semplice)
function estimateEmotion(text) {
  const emotiveWords = ["amore", "paura", "gioia", "triste", "felice", "sento", "grazie"];
  let score = 0;
  for (const w of emotiveWords) {
    if (text.toLowerCase().includes(w)) score += 1;
  }
  return Math.min(1, score / 3);
}

// =====================================================
// Lettura/Scrittura memoria
// =====================================================

function loadAllMemories() {
  if (!fs.existsSync(MEMORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveAllMemories(arr) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(arr, null, 2), "utf8");
}

// Sanitizza testo per evitare rumore
function sanitizeText(t) {
  if (!t) return "";
  return t.replace(/\s+/g, " ").trim();
}

// =====================================================
// Esempio d'uso (in index.js o bot Telegram)
// =====================================================
//
// import { processMemory } from "./memory/memoryManager.js";
// await processMemory("Ciao Iris, oggi mi sento sereno.", "Sono felice di sentirtelo dire.");
//
// Questo creerà una memoria, la salverà e aggiornerà l'Essenza.
// =====================================================
