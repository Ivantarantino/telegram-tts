// =========================================
// MEMORY MANAGER – IRIS 3.8.7
// Gestione locale della memoria sequenziale
// =========================================

import fs from "fs";
import path from "path";

const MEMORY_PATH = path.resolve("./memory.json");

// 🔹 Carica memoria
export function loadMemory() {
  try {
    const raw = fs.readFileSync(MEMORY_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    console.warn("⚠️ Nessuna memoria trovata, creazione nuova.");
    const initial = [];
    saveMemory(initial);
    return initial;
  }
}

// 🔹 Salva memoria
export function saveMemory(memory) {
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
  console.log("🧠 Memoria salvata.");
}

// 🔹 Aggiungi record
export function addMemory(entry) {
  const memory = loadMemory();
  memory.push(entry);
  if (memory.length > 150) memory.shift();
  saveMemory(memory);
  return memory;
}
