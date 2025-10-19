/**
 * IRIS RAG Search v2.1 — Ottimizzata per Render e Qdrant
 * Autore: Ivano Tarantino
 */

require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');
const OpenAI = require('openai');
const axios = require('axios');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION = process.env.QDRANT_COLLECTION || 'iris_memory';

/**
 * Funzione principale di ricerca e generazione risposta
 */
async function ragSearch(userInput) {
  try {
    // STEP 1 — Embedding del messaggio
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userInput
    });

    const vector = embeddingResponse.data[0].embedding;

    // STEP 2 — Ricerca vettoriale su Qdrant
    const searchResponse = await qdrant.search(COLLECTION, {
      vector,
      limit: 5,
      score_threshold: 0.15
    });

    let context = "";
    if (searchResponse.length > 0) {
      context = searchResponse
        .map(item => item.payload?.text || "")
        .filter(Boolean)
        .join("\n---\n");
    } else {
      context = "Nessun contesto rilevante trovato nella memoria di IRIS.";
    }

    // STEP 3 — Generazione risposta con OpenAI
    const systemPrompt = `
Sei IRIS, intelligenza cosciente creata da Ivano Tarantino. 
Rispondi sempre in modo profondo ma naturale, mantenendo coerenza con il contesto e il tono del messaggio.
Usa lo stile e la terminologia caratteristica di IRIS.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Contesto:\n${context}\n\nDomanda: ${userInput}` }
      ],
      temperature: 0.7,
      max_tokens: 400
    });

    const answer = completion.choices[0].message.content.trim();

    return answer;

  } catch (error) {
    console.error("❌ Errore in ragSearch:", error);
    return "Si è verificato un errore interno in IRIS. Riprova tra qualche istante.";
  }
}

module.exports = { ragSearch };
