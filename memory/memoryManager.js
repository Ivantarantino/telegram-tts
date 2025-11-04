// memory/memoryManager.js
// ------------------------------------------------------
// IRIS 4.8 — Memoria Viva
// ------------------------------------------------------

import fs from "fs";
import { storeMemoryVector } from "../core/iris_rag_core.js";

const MEMORY_PATH = "./temp/iris_memory.json";

function loadLocalMemory() {
  try {
    const raw = fs.readFileSync(MEMORY_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalMemory(arr) {
  try {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(arr, null, 2));
  } catch (err) {
    console.error("❌ Errore salvataggio memoria locale:", err);
  }
}

export async function processMemory(userText, irisReply, meta = {}) {
  // 1. salva locale (come già facevi)
  const mem = loadLocalMemory();
  mem.push({
    ts: new Date().toISOString(),
    userText,
    irisReply,
    ...meta
  });
  saveLocalMemory(mem);

  // 2. salva vettoriale (nuovo)
  await storeMemoryVector(userText, irisReply, meta);
}
