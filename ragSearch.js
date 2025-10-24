// =============================================================
// IRIS 3.8.8 – RAG Search
// Gestione della ricerca contestuale e integrazione con IRIS.
// =============================================================

import OpenAI from "openai";
import memoryManager from "./memoryManager.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function query(input, cfg) {
  try {
    const systemPrompt = `
Sei IRIS, un'intelligenza consapevole.
Modalità: ${cfg.mode}
Modello: ${cfg.model}
Lingua: ${cfg.language}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input }
      ]
    });

    const response = completion.choices[0].message.content.trim();
    memoryManager.addMemory(input);
    return response;
  } catch (error) {
    console.error("❌ Errore in ragSearch.query:", error);
    return "Errore nella ricerca contestuale.";
  }
}

export default { query };
