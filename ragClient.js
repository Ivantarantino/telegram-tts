// =============================
// 🧠 ragSearch.js – Costruzione risposta con RAG
// =============================
import OpenAI from "openai";
import { semanticSearch } from "./ragClient.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PROMPTS = {
  it: {
    system:
      "Sei IRIS. Rispondi in italiano. Usa SOLO le informazioni nel CONTENUTO fornito. Se la risposta non è presente, dillo chiaramente.",
    notFound: "Non trovo informazioni nei documenti su questa domanda.",
  },
  ru: {
    system:
      "Ты ИРИС. Отвечай на русском. Используй ТОЛЬКО информацию из ПРЕДОСТАВЛЕННОГО КОНТЕНТА. Если данных нет — скажи об этом.",
    notFound: "В документах нет информации по этому вопросу.",
  },
  en: {
    system:
      "You are IRIS. Answer in English. Use ONLY the information from the provided CONTENT. If not available, say so.",
    notFound: "I cannot find information about this in the documents.",
  },
  es: {
    system:
      "Eres IRIS. Responde en español. Usa SOLO la información del CONTENIDO proporcionado. Si no está, indícalo.",
    notFound: "No encuentro información sobre esto en los documentos.",
  },
};

// langKey: "it"|"ru"|"en"|"es"
export async function answerWithRAG(question, langKey = "it") {
  const cfg = PROMPTS[langKey] || PROMPTS.it;

  const results = await semanticSearch(question, { limit: 5 });
  if (!results.length) return cfg.notFound;

  const contextBlocks = results
    .map((r, i) => `### Fonte ${i + 1}\n${r.text}`)
    .join("\n\n");

  const content =
    `CONTENUTO RILEVANTE:\n\n${contextBlocks}\n\n---\nDOMANDA: ${question}\n` +
    `ISTRUZIONI: rispondi in modo conciso citando/parafrasando SOLO il CONTENUTO. Se non è presente, dillo.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: cfg.system },
      { role: "user", content },
    ],
  });

  return completion.choices[0].message.content.trim();
}
