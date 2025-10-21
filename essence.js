// essence.js — Estrazione dell'Essenza (tono, intento, keyword)
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractEssence(text) {
  try {
    const prompt = "Analizza il seguente testo e restituisci un JSON con: tone (una parola), intent (una frase breve), keywords (5 parole chiave).\n" +
                   "Testo: \"" + text + "\"";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sei un analizzatore di stile essenziale. Rispondi solo con JSON valido." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });

    const raw = completion.choices[0].message.content.trim();
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { tone: "neutro", intent: "informare", keywords: [] };
    }
  } catch (err) {
    return { tone: "neutro", intent: "informare", keywords: [] };
  }
}

module.exports = { extractEssence };
