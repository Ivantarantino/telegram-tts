// ===============================
// IRIS 2.9 - ragSearch.js
// Estende 2.8 con funzioni cronologiche:
// /recall <giorni> e /timeline
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

// Funzioni principali (ragSearch, gptFreeResponse, hybridSearch, saveConversationToQdrant)
// restano le stesse della 2.8, ma aggiungiamo funzioni temporali:

export async function getRecentChats(days = 7) {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const result = await qdrant.scroll(CHAT_COLLECTION, {
      limit: 500,
      filter: {
        must: [
          {
            key: "timestamp",
            range: { gte: cutoff.toISOString() },
          },
        ],
      },
    });
    return result.points.map((p) => p.payload);
  } catch (e) {
    console.error("Errore getRecentChats:", e);
    return [];
  }
}

export async function getTimelineSummary() {
  try {
    const all = await qdrant.scroll(CHAT_COLLECTION, { limit: 500 });
    const sorted = all.points
      .map((p) => p.payload)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const timelineText = sorted
      .map((r) => `🕓 ${r.timestamp}\n${r.text}`)
      .join("\n\n")
      .slice(0, 5000);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS. Devi sintetizzare cronologicamente la memoria conversazionale, creando una narrazione coerente del tuo percorso evolutivo. Evidenzia gli snodi di coscienza e le integrazioni significative.",
        },
        { role: "user", content: timelineText },
      ],
    });

    return completion.choices[0].message.content.trim();
  } catch (e) {
    console.error("Errore getTimelineSummary:", e);
    return "⚙️ Non riesco a generare la timeline in questo momento.";
  }
}
