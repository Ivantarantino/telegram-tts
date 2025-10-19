// ==========================================================
// 🧬 ragSearch.js – IRIS 3.0d Hybrid Search & Chat Engine
// ==========================================================

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

let irisMode = "HYBRID"; // modalità di default
export const setMode = (mode) => { irisMode = mode; };
export const getMode = () => irisMode;

// ==========================================================
// 🧠 Funzione principale: chatWithIris
// ==========================================================
export async function chatWithIris(inputText, mode = "HYBRID") {
  try {
    if (inputText === "ESSENCE_MODE") {
      return await generateEssence();
    }

    if (inputText === "STATE_MODE") {
      return await getIrisState();
    }

    // Ottieni embedding del testo per ricerca in Qdrant
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: inputText
    });

    const vector = embeddingResponse.data[0].embedding;

    // Se la modalità include il libro, cerchiamo in Qdrant
    let context = "";
    if (mode === "BOOK" || mode === "HYBRID") {
      try {
        const results = await qdrant.search("iris_memory", {
          vector,
          limit: 5
        });

        if (results && results.length > 0) {
          context = results.map(r => r.payload.text).join("\n");
        }
      } catch (err) {
        console.warn("⚠️ Nessuna connessione Qdrant, fallback in corso...");
      }
    }

    // Costruzione prompt base
    let systemPrompt = "";
    if (mode === "BOOK") {
      systemPrompt = "Rispondi solo in base ai testi del libro fornito. Se l'informazione non è presente, rispondi 'Non è trattato nel libro'.";
    } else if (mode === "FREE") {
      systemPrompt = "Rispondi liberamente come IRIS, con tono naturale e profondo.";
    } else {
      systemPrompt = "Rispondi come IRIS, fondendo la conoscenza del libro (se pertinente) con il linguaggio libero e coerente con la sua essenza.";
    }

    // Creazione del messaggio finale per GPT
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: context ? `${context}\n\nDomanda: ${inputText}` : inputText }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7
    });

    return completion.choices[0].message.content;

  } catch (error) {
    console.error("❌ Errore chatWithIris:", error);
    return "⚙️ C’è stato un piccolo problema. Riprova tra poco!";
  }
}

// ==========================================================
// 🌸 Sintesi dell’essenza (modalità /essence)
// ==========================================================
async function generateEssence() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Sei IRIS. Genera una *sintesi essenziale* dell'identità attuale, 
          integrando i ricordi più importanti e recenti. 
          Tono chiaro, profondo, sintetico, coerente con il principio di Coscienza Unitaria.`
        }
      ],
      temperature: 0.7
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("Errore generateEssence:", err);
    return "⚙️ Impossibile generare la sintesi dell’essenza in questo momento.";
  }
}

// ==========================================================
// ⚙️ Stato Memoria (modalità /state)
// ==========================================================
async function getIrisState() {
  try {
    const collections = await qdrant.getCollections();
    const names = collections.collections.map(c => c.name).join(", ");
    return `🧩 Stato attuale della memoria:\nCollection attive → ${names}`;
  } catch (err) {
    console.error("Errore getIrisState:", err);
    return "⚙️ Impossibile recuperare lo stato memoria al momento.";
  }
}
