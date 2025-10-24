// =============================================================
// IRIS 3.8.8 – Memory Manager
// Gestisce la memoria contestuale del sistema IRIS.
// =============================================================

import fs from "fs";

const MEMORY_PATH = "./memory.json";

function status() {
  return fs.existsSync(MEMORY_PATH) ? "🧠 Attiva" : "⚪ Vuota";
}

function reset() {
  fs.writeFileSync(MEMORY_PATH, JSON.stringify([], null, 2));
}

function exportMemory() {
  const path = `./memory_export_${Date.now()}.json`;
  fs.copyFileSync(MEMORY_PATH, path);
  return path;
}

function addMemory(entry) {
  const memory = fs.existsSync(MEMORY_PATH)
    ? JSON.parse(fs.readFileSync(MEMORY_PATH))
    : [];
  memory.push({ entry, time: new Date().toISOString() });
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
}

export default {
  status,
  reset,
  export: exportMemory,
  addMemory
};
