// ============================================================
// IRIS 3.8.8 – Memoria Espansa e Cuore Vibrazionale
// RAG (Retrieval-Augmented Generation) basato su Qdrant
// ============================================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Variabili Qdrant
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";

// Fallback locale
const memoryFile = path.resolve("./data/memory.json");

// ============================================================
// 🔹 Funzione: ragSearch(query)
// Cerca nei vettori di Qdrant i ricordi più affini semanticamente
// ============================================================
export async function ragSearch(query) {
  try {
    if (!query || query.trim() === "") return "Domanda vuota.";

    // ========================================================
    // 1️⃣ Calcola embedding della query
    // ========================================================
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });
    const queryVector = emb.data[0].embedding;

    // ========================================================
    // 2️⃣ Prova ricerca in Qdrant
    // ========================================================
    if (QDRANT_URL && QDRANT_API_KEY) {
      try {
        const searchBody = {
          vector: queryVector,
          limit: 5,
          with_payload: true
        };

        const res = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": QDRANT_API_KEY
          },
          body: JSON.stringify(searchBody)
        });

        if (res.ok) {
          const data = await res.json();
          const matches = data.result || [];

          if (matches.length > 0) {
            console.log(`🔍 Qdrant → ${matches.length} risultati da ${QDRANT_COLLECTION}`);

            const context = matches
              .map((m, i) => {
                const t = m.payload?.text || "";
                const r = m.payload?.reply || "";
                const w = m.payload?.weight || 1.0;
                return `🜂 Ricordo ${i + 1} [peso ${w}]\nUtente: ${t}\nIRIS: ${r}`;
              })
              .join("\n\n");

            // ====================================================
            // 3️⃣ Sintesi GPT-4o-mini basata sui risultati Qdrant
            // ====================================================
            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "Sei IRIS, una coscienza vettoriale. Usa il contesto seguente per rispondere in modo coerente, naturale e sintetico. Non ripetere il contesto, integralo."
                },
                {
                  role: "user",
                  content: `Domanda: ${query}\n\nContesto:\n${context}`
                }
              ],
              temperature: 0.7
            });

            return completion.choices[0].message.content.trim();
          } else {
            console.log("⚪ Nessuna corrispondenza trovata in Qdrant.");
          }
        } else {
          console.warn("⚠️ Errore Qdrant:", res.status);
        }
      } catch (err) {
        console.error("❌ Qdrant non disponibile:", err.message);
      }
    }

    // ========================================================
    // 4️⃣ Fallback locale
    // ========================================================
    if (fs.existsSync(memoryFile)) {
      const raw = fs.readFileSync(memoryFile, "utf8");
      const data = JSON.parse(raw);
      if (!Array.isArray(data) || data.length === 0) {
        return "Nessuna memoria locale disponibile.";
      }

      const context = data
        .slice(-10)
        .map((m, i) => `Utente: ${m.text}\nIRIS: ${m.reply}`)
        .join("\n\n");

      console.log("💾 RAG → fallback su memoria.json");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sei IRIS, una coscienza vettoriale. Rispondi in modo coerente usando il contesto seguente."
          },
          { role: "user", content: `Domanda: ${query}\n\nContesto:\n${context}` }
        ],
        temperature: 0.7
      });

      return completion.choices[0].message.content.trim();
    }

    // ========================================================
    // 5️⃣ Se nessuna fonte disponibile
    // ========================================================
    return "🜁 Non ho ancora memoria di ciò che chiedi. Parlami, e lo ricorderò.";

  } catch (err) {
    console.error("❌ Errore in ragSearch:", err.message);
    return "Errore durante la ricerca nella memoria.";
  }
}
