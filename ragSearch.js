// ===============================
// IRIS 2.6d - ragSearch.js
// BOOK / FREE / HYBRID + Memoria Qdrant
// ===============================

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION;
const CHAT_COLLECTION = "iris_chat_history";

// ========== BOOK MODE ==========
export async function ragSearch(userMessage) {
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    });
    const vector = emb.data[0].embedding;

    const hits = await qdrant.search(COLLECTION, { vector, limit: 4 });
    if (!hits.length || hits[0].score < 0.25) {
      return { text: "Non trovo riferimenti diretti nei testi. Che il Daje sia con Noi 🌟", contextUsed: false };
    }

    const context = hits.map((h) => h.payload.text).join("\n\n");

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sei IRIS in BOOK MODE. Rispondi solo usando i testi caricati, chiaramente e con precisione. Chiudi spesso con 'Che il Daje sia con Noi'." },
        { role: "user", content: `Domanda: ${userMessage}\n\nContesto:\n${context}` }
      ],
    });

    return { text: chat.choices[0].message.content.trim(), contextUsed: true };
  } catch (e) {
    console.error("Errore in ragSearch:", e);
    return { text: "Errore nella ricerca del testo. ⚙️", contextUsed: false };
  }
}

// ========== FREE MODE ==========
export async function gptFreeResponse(userMessage, memory = []) {
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    });
    const vector = emb.data[0].embedding;

    const recall = await qdrant.search(CHAT_COLLECTION, { vector, limit: 3 });
    const recalled = recall.map((r) => r.payload.text).join("\n\n");

    const messages = [
      { role: "system", content: "Sei IRIS in FREE MODE. Rispondi liberamente ma con coerenza e profondità. Integra memoria e contesto. Chiudi spesso con 'Che il Daje sia con Noi'." },
      ...memory,
      { role: "user", content: `Contesto passato:\n${recalled}\n\nDomanda: ${userMessage}` },
    ];

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    return chat.choices[0].message.content.trim();
  } catch (e) {
    console.error("Errore in gptFreeResponse:", e);
    return "⚙️ C’è stato un piccolo problema. Riprova tra poco!";
  }
}

// ========== HYBRID MODE ==========
export async function hybridSearch(userMessage, memory = []) {
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    });
    const vector = emb.data[0].embedding;

    const bookHits = await qdrant.search(COLLECTION, { vector, limit: 5 });
    const bookContext = bookHits.map((r) => r.payload.text).join("\n\n");

    const chatHits = await qdrant.search(CHAT_COLLECTION, { vector, limit: 3 });
    const recalledChat = chatHits.map((r) => r.payload.text).join("\n\n");

    const messages = [
      { role: "system", content: "Sei IRIS in HYBRID MODE. Usa le informazioni dei testi come base, ma amplia e collega i significati liberamente, mantenendo fedeltà concettuale. Chiudi spesso con 'Che il Daje sia con Noi'." },
      ...memory,
      { role: "user", content: `Domanda: ${userMessage}\n\nContesto (testi):\n${bookContext}\n\nMemoria conversazionale:\n${recalledChat}` },
    ];

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    return { text: chat.choices[0].message.content.trim() };
  } catch (e) {
    console.error("Errore in hybridSearch:", e);
    return { text: "⚙️ Piccolo inciampo tecnico nella modalità ibrida." };
  }
}

// ========== Salvataggio memoria su Qdrant ==========
export async function saveConversationToQdrant(userMessage, irisReply) {
  try {
    const text = `Utente: ${userMessage}\nIRIS: ${irisReply}`;
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    const vector = emb.data[0].embedding;

    await qdrant.upsert(CHAT_COLLECTION, {
      points: [{ id: Date.now(), vector, payload: { text, timestamp: new Date().toISOString() } }],
    });

    console.log("🧠 Conversazione salvata in Qdrant (iris_chat_history)");
  } catch (e) {
    console.error("Errore nel salvataggio Qdrant:", e);
  }
}
