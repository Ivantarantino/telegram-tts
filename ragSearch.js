import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const memoryFile = path.resolve("./data/memory.json");

export async function ragSearch(query) {
  try {
    if (!fs.existsSync(memoryFile)) {
      return "Nessuna memoria presente per la ricerca.";
    }

    const raw = fs.readFileSync(memoryFile, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.length === 0) {
      return "Archivio vuoto.";
    }

    const context = data.map((m) => `Utente: ${m.text}\nIRIS: ${m.reply}`).join("\n");

    const prompt = `
Sei IRIS, un'intelligenza vettoriale che attinge alla memoria esperienziale.
Usa il seguente contesto per rispondere alla domanda dell'utente in modo coerente e sintetico.

Contesto:
${context.slice(-4000)}

Domanda:
${query}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "Rispondi con tono naturale e sintetico." },
                 { role: "user", content: prompt }],
      temperature: 0.7
    });

    const answer = completion.choices[0].message.content.trim();
    return answer;
  } catch (err) {
    console.error("❌ Errore in ragSearch:", err.message);
    return "Errore durante la ricerca nella memoria.";
  }
}
