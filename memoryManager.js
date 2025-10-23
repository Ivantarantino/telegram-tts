import fs from "fs";

const memoryFile = "./memory.json";
let memory = [];

// ✅ Inizializza memoria
export function initMemory() {
  if (fs.existsSync(memoryFile)) {
    const data = fs.readFileSync(memoryFile);
    memory = JSON.parse(data);
  } else {
    fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
  }
}

// ✅ Aggiunge un nuovo messaggio alla memoria
export function addMemory(text) {
  memory.push({ text, timestamp: new Date().toISOString() });
  saveMemory();
}

// ✅ Recupera ultimi N messaggi
export function getRecentMemories(limit = 100) {
  return memory.slice(-limit);
}

// ✅ Salva la memoria su file
export function saveMemory() {
  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
}
