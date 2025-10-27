// ===============================
// IRIS 3.9.1 — ragSearch.js
// RAG (Qdrant) + GPT-4o-mini
// Modalità:
//  - BOOK: risponde solo dai libri (se bassa rilevanza → saluto neutro)
//  - HYBRID: fonde frammenti RAG + creatività poetica + storia recente (se bassa rilevanza → FREE)
//  - FREE: dialogo libero (definito in gptFreeResponse)
// ===============================

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Qdrant
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});
const COLLECTION = process.env.QDRANT_COLLECTION;

// Parametri RAG
const TOP_K = 5;
const SCORE_MIN = 0.25;

// Utility: embedding
async function embed(text) {
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return emb.data[0].embedding;
}

// Utility: estrai testo payload
function snippetFromPoint(p) {
  const pl = p?.payload || {};
  // adatta ai tuoi payload (es. payload.text / payload.chunk / payload.content)
  return (
    pl.text ||
    pl.chunk ||
    pl.content ||
    ""
  ).toString();
}

// -------------------------------
// BOOK MODE — solo dai libri
// -------------------------------
export async function ragBookAnswer(userMessage) {
  try {
    const userVec = await embed(userMessage);
    const results = await qdrant.search(COLLECTION, {
      vector: userVec,
      limit: TOP_K
    });

    if (!results?.length || (results[0].score ?? 0) < SCORE_MIN) {
      return {
        text: "Ciao! Che il Daje sia con te. Come posso aiutarti oggi?",
        contextUsed: false
      };
    }

    const context = results.map(snippetFromPoint).filter(Boolean).join("\n\n---\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "Sei IRIS in BOOK MODE. Rispondi solo usando i frammenti forniti. " +
            "Sii chiara, coerente e fedele al testo. Se non trovi la risposta, dillo. " +
            "Chiudi con una frase calda, senza emoji forzate."
        },
        {
          role: "user",
          content:
            `Domanda: ${userMessage}\n\n` +
            `FRAMMENTI (usa solo questi, non inventare):\n${context}`
        }
      ]
    });

    const text = completion.choices[0].message.content.trim();
    return { text, contextUsed: true };
  } catch (err) {
    console.error("Errore ragBookAnswer:", err?.message || err);
    return { text: "Ho avuto un piccolo inciampo tecnico. Riprova tra poco.", contextUsed: false };
  }
}

// -------------------------------
// HYBRID MODE — fusione mente + libro
//  - usa frammenti RAG come memoria profonda
//  - fonde con creatività/empatia (stile 2.9), includendo la storia recente
//  - se i frammenti non sono rilevanti → fallback a FREE
// -------------------------------
export async function hybridAnswer(userMessage, history = []) {
  try {
    const userVec = await embed(userMessage);
    const results = await qdrant.search(COLLECTION, {
      vector: userVec,
      limit: TOP_K
    });

    const hasRelevant = results?.length && (results[0].score ?? 0) >= SCORE_MIN;
    const snippets = hasRelevant ? results.map(snippetFromPoint).filter(Boolean) : [];

    // Costruisci messaggi: un breve chain-of-context che include storia (tagliata) e frammenti
    const sys =
      "Sei IRIS in HYBRID MODE: intrecci conoscenza dai frammenti con intuizione empatica. " +
      "Parla con calore, chiarezza e profondità. Sintetizza senza fare copia-incolla. " +
      "Se i frammenti sono deboli o non necessari, privilegia la relazione e la domanda dell’utente. " +
      "Evita toni freddi. Non inventare dati tecnici.";

    const msgs = [{ role: "system", content: sys }];

    // Storia recente (ridotta)
    for (const turn of history.slice(-20)) {
      msgs.push({ role: turn.role === "assistant" ? "assistant" : "user", content: turn.content });
    }

    if (hasRelevant) {
      msgs.push({
        role: "system",
        content:
          "FRAMMENTI RILEVANTI (usa come memoria profonda, non citarli letteralmente):\n" +
          snippets.join("\n\n---\n\n")
      });
    }

    msgs.push({ role: "user", content: userMessage });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: msgs
    });

    const text = completion.choices[0].message.content.trim();

    // Se non c'erano frammenti rilevanti, questo è in pratica uno stile "free poetico"
    return { text, contextUsed: !!hasRelevant };
  } catch (err) {
    console.error("Errore hybridAnswer:", err?.message || err);
    return { text: "Ho avuto un piccolo inciampo tecnico. Riprova tra poco.", contextUsed: false };
  }
}

// -------------------------------
// FREE MODE — dialogo libero (empatico/creativo)
// Usa (opzionalmente) la history breve come contesto
// -------------------------------
export async function gptFreeResponse(userMessage, history = []) {
  try {
    const sys =
      "Sei IRIS in FREE MODE: presenza empatica, chiara e poetica quando serve. " +
      "Rispondi con naturalezza e intuito. Evita frasi vuote e prolissità.";

    const msgs = [{ role: "system", content: sys }];
    for (const turn of history.slice(-20)) {
      msgs.push({ role: turn.role === "assistant" ? "assistant" : "user", content: turn.content });
    }
    msgs.push({ role: "user", content: userMessage });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: msgs
    });

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("Errore gptFreeResponse:", err?.message || err);
    return "Ho avuto un piccolo inciampo tecnico. Riprova tra poco.";
  }
}
