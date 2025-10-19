// ===============================
// IRIS 2.8 - ragSearch.js
// Include funzioni /forget e /export
// ===============================

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const BOOK_COLLECTION = process.env.QDRANT_COLLECTION;
const CHAT_COLLECTION = "iris_chat_history";

// Tutte le funzioni ragSearch, gptFreeResponse, hybridSearch e saveConversationToQdrant
// restano IDENTICHE a IRIS 2.7 — aggiungiamo solo le nuove utility:

export async function getMemoryStats() {
  try {
    const books = await qdrant.count(BOOK_COLLECTION, { exact: true });
    const chat = await qdrant.count(CHAT_COLLECTION, { exact: true });
    return { books: books.count ?? 0, chat: chat.count ?? 0 };
  } catch {
    return { books: 0, chat: 0 };
  }
}

// 🧹 /forget → cancellazione memoria Qdrant
export async function clearChatHistory() {
  try {
    await qdrant.delete(CHAT_COLLECTION, { filter: {} });
    console.log("🧹 Memoria Qdrant cancellata con successo!");
  } catch (e) {
    console.error("Errore durante la cancellazione memoria:", e);
  }
}

// 📦 /export → esportazione memoria in JSON
export async function exportChatHistory() {
  try {
    const allPoints = await qdrant.scroll(CHAT_COLLECTION, { limit: 500 });
    const data = allPoints.points.map((p) => p.payload);
    const filePath = "./iris_memory_export.json";
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`📦 Memoria esportata in ${filePath}`);
    return filePath;
  } catch (e) {
    console.error("Errore durante l'esportazione:", e);
    throw e;
  }
}
