import fs from "fs";

// ✅ Cerca termini nei file di memoria (semplice RAG locale)
export function ragSearch(query, limit = 5) {
  if (!query || query.trim() === "") return [];

  try {
    const data = fs.readFileSync("./memory.json", "utf-8");
    const memories = JSON.parse(data);

    const matches = memories
      .filter(m => m.text.toLowerCase().includes(query.toLowerCase()))
      .slice(-limit)
      .map(m => m.text);

    return matches.length > 0
      ? matches
      : ["Nessun risultato trovato per la ricerca."];
  } catch (err) {
    console.error("❌ Errore durante la ricerca RAG:", err);
    return ["Errore durante la ricerca nella memoria."];
  }
}
