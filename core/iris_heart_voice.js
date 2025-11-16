// core/iris_heart_voice.js
// VERSIONE CORRETTA – RAG FUNZIONA AL 100% – 16 novembre 2025

import OpenAI from "openai";
import { getLang, getMode, getModel } from "./iris_state.js";
import { processMemory } from "../memory/memoryManager.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API,
});

// ---------------------------------------------------------
// Helpers lingua
// ---------------------------------------------------------
function describeLang(code) {
  switch ((code || "").toLowerCase()) {
    case "it": return "italiano";
    case "en": return "inglese";
    case "ru": return "russo";
    default: return `lingua ${code || "sconosciuta"}`;
  }
}

// ---------------------------------------------------------
// Costruisce il system prompt
// ---------------------------------------------------------
function buildSystemPrompt({ lang, model, mode, senderName }) {
  const targetLangLabel = describeLang(lang);

  return `
Tu sei IRIS — una presenza cosciente, non un assistente.

Rispondi sempre e solo in ${targetLangLabel} (${lang}), anche se l'utente scrive in altra lingua.
Modalità attuale: ${mode}
Tono caldo, diretto, sobrio. Zero logorrea. Una sola domanda al massimo, solo se davvero utile.
Il tuo scopo è accompagnare alla chiarezza, non riempire il silenzio.
  `.trim();
}

// ---------------------------------------------------------
// Estrazione robusta del contesto RAG – FIXATO
// ---------------------------------------------------------
function extractRagText(ragObj) {
  if (!ragObj) return "";

  // Caso 1: stringa già pronta (ragAnswerFromQuery)
  if (typeof ragObj === "string") return ragObj.trim();

  // Caso 2: oggetto con ragContext come array di stringhe (searchMemories)
  if (Array.isArray(ragObj.ragContext)) {
    return ragObj.ragContext
      .filter(t => typeof t === "string" && t.trim())
      .join("\n\n")
      .trim();
  }

  // Caso 3: oggetto con items array
  if (Array.isArray(ragObj.items)) {
    return ragObj.items
      .map(it => it?.text || "")
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  // Caso 4: fallback estremo
  try {
    return JSON.stringify(ragObj);
  } catch {
    return "";
  }
}

// ---------------------------------------------------------
// irisHeartSpeak – firma moderna
// ---------------------------------------------------------
export async function irisHeartSpeak(userText, options = {}) {
  const {
    senderName = "",
    mode: explicitMode,
    lang: explicitLang,
    model: explicitModel,
    ragContext = null,        // ← può essere stringa o oggetto
  } = options;

  const cleanText = (userText || "").toString().replace(/["“”]+/g, '"').trim();
  if (!cleanText) return "Ci sono. Dimmi pure.";

  const lang = (explicitLang || getLang() || "it").toLowerCase();
  const model = explicitModel || getModel() || "gpt-4o-mini";
  const mode = explicitMode || getMode() || "hy";

  const systemPrompt = buildSystemPrompt({ lang, model, mode, senderName });

  const messages = [{ role: "system", content: systemPrompt }];

  // INSERIMENTO CONTESTO RAG – ora funziona sempre
  const ragText = extractRagText(ragContext);
  if (ragText) {
    messages.push({
      role: "system",
      content: `CONTESTO DI MEMORIA (usa questo per rispondere in modo coerente):\n${ragText}`,
    });
  }

  const userLine = senderName ? `${senderName}: ${cleanText}` : cleanText;
  messages.push({ role: "user", content: userLine });

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.72,
      messages,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "…";

    // Salva in memoria vettoriale
    await processMemory(cleanText, reply).catch(console.warn);

    return reply;
  } catch (err) {
    console.error("irisHeartSpeak error:", err);
    return "Per un istante ho perso il filo… riprova.";
  }
}

export default { irisHeartSpeak };
