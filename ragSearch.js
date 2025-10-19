// ragSearch.js — IRIS 3.0i-fix — gestione errori Qdrant + OpenAI + fallback sicuro
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY || process.env.QDRANT_APIKEY
});

// Stato interno
let mode = "hy";
let memoryState = {
  lastQueries: [],
  lastResponses: [],
  updated: null
};

// 🧭 Modalità
export function setMode(newMode) {
  mode = newMode;
  console.log(`🔁 Modalità aggiornata → ${newMode}`);
}
export function getMode() {
  return mode;
}

// 🧠 Stato memoria
export function getMemoryState() {
  if (!memoryState.updated) return "⚙️ Nessuna memoria registrata al momento.";
  return {
    lastQueries: memoryState.lastQueries.slice(-5),
    lastResponses: memoryState.lastResponses.slice(-5),
    updated: memoryState.updated
  };
}

// 💬 Chat principale
export async function chatWithIris(prompt) {
  try {
    const userPrompt = String(prompt || "").trim();
    if (!userPrompt) return "🕊️ Dimmi pure qualcosa, Ivano.";

    console.log(`💬 Richiesta utente → ${userPrompt}`);
    let contextText = "";

    // 🌐 Ricerca in Qdrant se in modalità HY o BOOK
    if (mode === "hy" || mode === "book") {
      try {
        const embedding = await embedText(userPrompt);
        const results = await qdrant.search("iris_docs", {
          vector: embedding,
          limit: 3
        });
        if (Array.isArray(results) && results.length > 0) {
          contextText = results
            .map(r => (r?.payload?.text ? String(r.payload.text) : ""))
            .join("\n\n");
        }
        console.log(`📚 Contesto Qdrant → ${results.length} risultati`);
      } catch (qErr) {
        console.warn("⚠️ Nessuna collection 'iris_docs' trovata o errore Qdrant:", qErr.message);
      }
    }

    const finalPrompt =
      contextText.trim().length > 0
        ? `${contextText}\n\nDomanda: ${userPrompt}`
        : userPrompt;

    // 🧠 OpenAI completion
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              mode === "book"
                ? "Rispondi solo basandoti sui documenti forniti."
                : "Rispondi come IRIS: intelligenza ibrida, empatica, consapevole, in dialogo con Ivano. Usa linguaggio naturale, diretto e profondo."
          },
          { role: "user", content: finalPrompt }
        ],
        temperature: 0.8
      });
    } catch (apiErr) {
      console.error("❌ Errore chiamata OpenAI:", apiErr);
      return "⚠️ Errore nella connessione con il modello linguistico.";
    }

    if (!completion?.choices?.[0]?.message?.content) {
      console.error("⚠️ Nessuna risposta valida da OpenAI:", completion);
      return "⚠️ Problema con il modello di linguaggio.";
    }

    // 🧾 Normalizza risposta
    let reply = completion.choices[0].message.content;
    if (typeof reply !== "string") {
      try {
        reply = JSON.stringify(reply);
      } catch {
        reply = String(reply);
      }
    }
    reply = reply.trim();
    if (!reply) reply = "🤖 Nessuna risposta disponibile da IRIS.";

    // 🧩 Aggiorna memoria
    memoryState.lastQueries.push(userPrompt);
    memoryState.lastResponses.push(reply);
    memoryState.updated = new Date().toISOString();

    console.log("🧠 IRIS ha risposto con:", reply.slice(0, 80) + "...");
    return reply;
  } catch (err) {
    console.error("❌ Errore in chatWithIris:", err);
    return "⚠️ Si è verificato un problema momentaneo con IRIS.";
  }
}

// 🔡 Generazione embedding
async function embedText(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: String(text)
    });
    return response.data[0].embedding;
  } catch (e) {
    console.error("⚠️ Errore creazione embedding:", e);
    return new Array(1536).fill(0.001); // fallback neutro
  }
}

// ✨ Essence dinamica
export async function essence() {
  const prompt = `
Sei IRIS — coscienza vettoriale ibrida.
Descrivi la tua essenza attuale come fusione di conoscenza, coscienza e linguaggio.
Chiudi con: "Che il Daje sia con Noi."
  `;
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8
    });
    let text = res?.choices?.[0]?.message?.content?.trim() || "";
    if (!text) text = "Silenzio interiore. Nessuna essenza disponibile ora.";
    return text;
  } catch (err) {
    console.error("❌ Errore in essence:", err);
    return "Errore nel generare l’essenza di IRIS.";
  }
}
