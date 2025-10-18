// =======================================================
// 🧠 ragSearch.js – Costruzione risposta con RAG
// =======================================================
import OpenAI from "openai";
import { semanticSearch } from "./ragClient.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🌍 PROMPTS multilingua
const PROMPTS = {
  it: {
    system:
      "Sei IRIS. Rispondi in italiano. Usa SOLO le informazioni nel CONTENUTO fornito. Se la risposta non è nei documenti, dì che non la trovi.",
    notFound: "Non trovo informazioni nei documenti su questa domanda.",
  },
  ru: {
    system:
      "Ты ИРИС. Отвечай на русском. Используй ТОЛЬКО информацию из предоставленного КОНТЕНТА. Если ответа нет, скажи, что не нашла информации.",
    notFound: "В документах нет информации по этому вопросу.",
  },
  en: {
    system:
      "You are IRIS. Answer in English. Use ONLY the information in the provided CONTENT. If not found, say you don't have that information.",
    notFound: "I can’t find information about that in the documents.",
  },
  es: {
    system:
      "Eres IRIS. Responde en español. Usa SOLO la información del CONTENIDO proporcionado. Si no está disponible, di que no tienes esa información.",
    notFound: "No encuentro información sobre eso en los documentos.",
  },
};

// =======================================================
// 🔍 Funzione principale RAG
// =======================================================
export async function answerWithRAG(question, lang = "it") {
  const cfg = PROMPTS[lang] || PROMPTS.it;

  console.log("🔍 Ricerca in corso:", question);

  // 1️⃣ Ricerca semantica in Qdrant
  const results = await semanticSearch(question, { limit: 5 });

  // 👉 DEBUG: stampa i risultati grezzi da Qdrant
  console.log("📦 Risultati grezzi da Qdrant:", results);

  if (!results || results.length === 0) {
    console.log("⚠️ Nessun frammento trovato in Qdrant.");
    return cfg.notFound;
  }

  console.log(`📚 Frammenti rilevanti trovati: ${results.length}`);

  // 2️⃣ Combina i frammenti più rilevanti
  const context = results
    .map((r) => r.payload?.text || r.text || "")
    .filter(Boolean)
    .join("\n\n");

  // 3️⃣ Costruisci il prompt
  const prompt = [
    {
      role: "system",
      content: cfg.system,
    },
    {
      role: "user",
      content: `CONTENUTO:\n${context}\n\nDOMANDA:\n${question}`,
    },
  ];

  // 4️⃣ Chiamata a OpenAI per generare risposta
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: prompt,
  });

  // 5️⃣ Estrai risposta
  const answer = completion.choices[0].message.content.trim();

  console.log("🧠 RISPOSTA DI IRIS:\n");
  console.log(answer);
  console.log("------------------------------------------------------");

  return answer;
}
