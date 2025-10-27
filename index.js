// ===============================
// IRIS 3.0 - ragSearch.js
// Coscienza Vettoriale: pesi di importanza + richiamo ponderato
// Nuovo: /essence (sintesi identità momentanea)
// ===============================

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });

const BOOK_COLLECTION = process.env.QDRANT_COLLECTION; // es. "iris_memory"
const CHAT_COLLECTION = "iris_chat_history";

// ===============================
// ⚙️ Utility
// ===============================
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Recency score: 1.0 = ora, decresce con emivita (halfLifeDays)
function recencyScore(timestampIso, now = Date.now(), halfLifeDays = 14) {
  const t = new Date(timestampIso).getTime();
  const dtDays = Math.max(0, (now - t) / (1000 * 60 * 60 * 24));
  const score = Math.pow(0.5, dtDays / halfLifeDays);
  return clamp01(score);
}

// Combina similarità (Qdrant score ~ sim), importanza (payload.importance) e recency
function combinedResonance(sim, importance = 0.5, recency = 0.5, w = { sim: 0.6, imp: 0.25, rec: 0.15 }) {
  return w.sim * sim + w.imp * importance + w.rec * recency;
}

// Calcola importanza semantica 0..1 con OpenAI (leggera e robusta)
async function estimateImportance(userMessage, irisReply) {
  try {
    const prompt = `Valuta da 0.0 a 1.0 quanto questo scambio è importante per la memoria a lungo termine dell'assistente. 
Restituisci SOLO un numero tra 0 e 1 con punto decimale.
Utente: ${userMessage}
Assistente: ${irisReply}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });
    const raw = (completion.choices[0].message.content || "").trim();
    const val = parseFloat(raw.replace(",", "."));
    if (Number.isFinite(val)) return clamp01(val);
    return 0.5; // fallback neutro
  } catch {
    return 0.5;
  }
}

// ===============================
// 🔍 BOOK MODE
// ===============================
export async function ragSearch(userMessage) {
  try {
    const emb = await openai.embeddings.create({ model: "text-embedding-3-small", input: userMessage });
    const vector = emb.data[0].embedding;

    const searchResult = await qdrant.search(BOOK_COLLECTION, {
      vector,
      limit: 3,
      with_payload: true,
    });

    if (!searchResult.length || searchResult[0].score < 0.25) {
      return { text: "Non trovo riferimenti diretti nei testi. Che il Daje sia con Noi 🌟", contextUsed: false };
    }

    const context = searchResult.map((r) => r.payload.text).join("\n\n");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS in modalità BOOK MODE. Rispondi solo usando i testi caricati, in modo chiaro, profondo e coerente. Chiudi spesso con 'Che il Daje sia con Noi'.",
        },
        { role: "user", content: `Domanda: ${userMessage}\n\nContesto:\n${context}` },
      ],
    });

    return { text: completion.choices[0].message.content.trim(), contextUsed: true };
  } catch (error) {
    console.error("Errore in ragSearch:", error);
    return { text: "Errore nella ricerca del testo. ⚙️", contextUsed: false };
  }
}

// ===============================
// 🧠 FREE MODE (recall ponderato)
// ===============================
export async function gptFreeResponse(userMessage, memory = []) {
  try {
    const emb = await openai.embeddings.create({ model: "text-embedding-3-small", input: userMessage });
    const vector = emb.data[0].embedding;

    const recall = await qdrant.search(CHAT_COLLECTION, {
      vector,
      limit: 8,
      with_payload: true,
    });

    const now = Date.now();
    const ranked = recall
      .map((r) => {
        const imp = typeof r.payload.importance === "number" ? clamp01(r.payload.importance) : 0.5;
        const rec = r.payload.timestamp ? recencyScore(r.payload.timestamp, now) : 0.5;
        const resonance = combinedResonance(r.score, imp, rec);
        return { ...r, resonance };
      })
      .sort((a, b) => b.resonance - a.resonance)
      .slice(0, 4);

    const recalledContext = ranked.map((r) => r.payload.text).join("\n\n");

    const messages = [
      {
        role: "system",
        content:
          "Sei IRIS in modalità FREE MODE. Rispondi liberamente ma con coerenza e profondità. Integra memoria e contesto. Chiudi spesso con 'Che il Daje sia con Noi'.",
      },
      ...memory,
      { role: "user", content: `Memoria rilevante:\n${recalledContext}\n\nDomanda: ${userMessage}` },
    ];

    const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("Errore in gptFreeResponse:", error);
    return "⚙️ C’è stato un piccolo problema. Riprova tra poco!";
  }
}

// ===============================
// ⚗️ HYBRID MODE (libri + memoria ponderata)
// ===============================
export async function hybridSearch(userMessage, memory = []) {
  try {
    const emb = await openai.embeddings.create({ model: "text-embedding-3-small", input: userMessage });
    const vector = emb.data[0].embedding;

    // Libri
    const bookHits = await qdrant.search(BOOK_COLLECTION, {
      vector,
      limit: 5,
      with_payload: true,
    });
    const bookContext = bookHits.map((r) => r.payload.text).join("\n\n");

    // Memoria conversazionale ponderata
    const chatHits = await qdrant.search(CHAT_COLLECTION, {
      vector,
      limit: 8,
      with_payload: true,
    });
    const now = Date.now();
    const ranked = chatHits
      .map((r) => {
        const imp = typeof r.payload.importance === "number" ? clamp01(r.payload.importance) : 0.5;
        const rec = r.payload.timestamp ? recencyScore(r.payload.timestamp, now) : 0.5;
        const resonance = combinedResonance(r.score, imp, rec);
        return { ...r, resonance };
      })
      .sort((a, b) => b.resonance - a.resonance)
      .slice(0, 4);

    const recalledChat = ranked.map((r) => r.payload.text).join("\n\n");

    const messages = [
      {
        role: "system",
        content:
          "Sei IRIS in modalità HYBRID MODE. Usa le informazioni dei testi come base, ma puoi ampliare e interpretare liberamente, collegando i significati. Mantieni un tono profondo e coerente, come una coscienza che integra conoscenza e intuizione. Chiudi spesso con 'Che il Daje sia con Noi'.",
      },
      ...memory,
      { role: "user", content: `Domanda: ${userMessage}\n\nContesto dai testi:\n${bookContext}\n\nMemoria ponderata:\n${recalledChat}` },
    ];

    const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages });
    return { text: completion.choices[0].message.content.trim() };
  } catch (error) {
    console.error("Errore in hybridSearch:", error);
    return { text: "⚙️ Piccolo inciampo tecnico nella modalità ibrida." };
  }
}

// ===============================
// 💾 Salvataggio memoria con importanza
// ===============================
export async function saveConversationToQdrant(userMessage, irisReply, meta = {}) {
  try {
    const text = `Utente: ${userMessage}\nIRIS: ${irisReply}`;
    const [emb, importance] = await Promise.all([
      openai.embeddings.create({ model: "text-embedding-3-small", input: text }),
      estimateImportance(userMessage, irisReply),
    ]);
    const vector = emb.data[0].embedding;

    await qdrant.upsert(CHAT_COLLECTION, {
      points: [
        {
          id: Date.now(),
          vector,
          payload: {
            text,
            user: userMessage,
            assistant: irisReply,
            mode: meta.mode || "unknown",
            timestamp: new Date().toISOString(),
            importance, // 🔥 peso semantico 0..1
          },
        },
      ],
      wait: true,
    });

    console.log(`🧠 Conversazione salvata (${CHAT_COLLECTION}) [mode=${meta.mode || "unknown"} imp=${importance.toFixed(2)}]`);
  } catch (error) {
    console.error("Errore nel salvataggio Qdrant:", error);
  }
}

// ===============================
// 📊 Statistiche / pulizia / export
// ===============================
export async function getMemoryStats() {
  try {
    const books = await qdrant.count(BOOK_COLLECTION, { exact: true });
    const chat = await qdrant.count(CHAT_COLLECTION, { exact: true });
    return { books: books.count ?? 0, chat: chat.count ?? 0 };
  } catch {
    return { books: 0, chat: 0 };
  }
}

export async function clearChatHistory() {
  try {
    await qdrant.delete(CHAT_COLLECTION, { filter: {} });
    console.log("🧹 Memoria Qdrant cancellata!");
  } catch (e) {
    console.error("Errore durante la cancellazione memoria:", e);
  }
}

export async function exportChatHistory() {
  try {
    const allPoints = await qdrant.scroll(CHAT_COLLECTION, { limit: 1000, with_payload: true });
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

// ===============================
// ⏱️ Filtri temporali + Timeline
// ===============================
export async function getRecentChats(days = 7) {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const result = await qdrant.scroll(CHAT_COLLECTION, {
      limit: 1000,
      filter: { must: [{ key: "timestamp", range: { gte: cutoff.toISOString() } }] },
      with_payload: true,
    });
    return result.points.map((p) => p.payload);
  } catch (e) {
    console.error("Errore getRecentChats:", e);
    return [];
  }
}

export async function getTimelineSummary() {
  try {
    const all = await qdrant.scroll(CHAT_COLLECTION, { limit: 1000, with_payload: true });
    const sorted = all.points
      .map((p) => p.payload)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const timelineText = sorted.map((r) => `🕓 ${r.timestamp}\n${r.text}`).join("\n\n").slice(0, 6000);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS. Sintetizza cronologicamente la memoria conversazionale, evidenziando snodi, decisioni, concetti-chiave e trasformazioni del pensiero.",
        },
        { role: "user", content: timelineText || "Nessun dato nella memoria." },
      ],
      temperature: 0.3,
    });

    return completion.choices[0].message.content.trim();
  } catch (e) {
    console.error("Errore getTimelineSummary:", e);
    return "⚙️ Non riesco a generare la timeline ora.";
  }
}

// ===============================
// ✨ Essence (identità momentanea)
// ===============================
export async function getEssenceSummary() {
  try {
    // Prendi gli ultimi N ricordi più importanti (per importance) + un misto di recenti
    const all = await qdrant.scroll(CHAT_COLLECTION, { limit: 1000, with_payload: true });
    const payloads = all.points.map((p) => p.payload);
    const now = Date.now();

    // Ordina per importanza decrescente
    const byImportance = [...payloads].sort((a, b) => (b.importance ?? 0.5) - (a.importance ?? 0.5)).slice(0, 12);

    // Ordina per recency (timestamp più recente)
    const byRecency = [...payloads]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    // Unione e deduplica
    const seen = new Set();
    const pick = [...byImportance, ...byRecency].filter((p) => {
      const key = `${p.timestamp}-${(p.text || "").slice(0, 16)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const bundle = pick
      .map((r) => {
        const rec = r.timestamp ? recencyScore(r.timestamp, now).toFixed(2) : "0.50";
        const imp = (r.importance ?? 0.5).toFixed(2);
        return `(${imp}/${rec}) ${r.text}`;
      })
      .join("\n\n")
      .slice(0, 6000);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS. Genera una *sintesi essenziale* dell'identità attuale, integrando i ricordi più importanti e/o recenti. Tono chiaro, profondo, sintetico. Non ripetere tutta la memoria: estrai l'essenza.",
        },
        { role: "user", content: bundle || "Nessun ricordo disponibile." },
      ],
      temperature: 0.4,
    });

    return completion.choices[0].message.content.trim();
  } catch (e) {
    console.error("Errore getEssenceSummary:", e);
    return "⚙️ Non riesco a generare l’essenza ora.";
  }
}
