// core/iris_heart_voice.js
// ---------------------------------------------------------
// IRIS — Cuore Diretto (Base BELLISSIMA)
// ---------------------------------------------------------
// - Comprende italiano, inglese, russo (e altre lingue).
// - Risponde SEMPRE e SOLO nella lingua impostata in iris_state (/lang).
// - Niente eco, niente sigilli, niente "Amico" di default.
// - Stile: caldo, diretto, umano, massimo una domanda autentica.
// ---------------------------------------------------------

import OpenAI from "openai";
import { getLang, getModel } from "./iris_state.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API,
});

// Mappa codice lingua → descrizione naturale
function describeLang(lang) {
  switch ((lang || "").toLowerCase()) {
    case "it":
      return "italiano";
    case "en":
      return "inglese";
    case "ru":
      return "russo";
    default:
      return `lingua ${lang}`;
  }
}

/**
 * irisHeartSpeak
 *
 * Supporta due firme per compatibilità:
 *  1) Nuova:  irisHeartSpeak(message, { senderName, mode })
 *  2) Legacy: irisHeartSpeak(name, message, weights)
 */
export async function irisHeartSpeak(arg1, arg2 = {}, arg3 = {}) {
  let senderName = "";
  let userText = "";
  let mode = "hy";

  // Firma legacy: (name, message, weights)
  if (typeof arg2 === "string") {
    senderName = (arg1 ?? "").toString().trim();
    userText = (arg2 ?? "").toString();
    // arg3 = weights (ignorati per ora in questa base B)
  } else {
    // Nuova firma: (message, options)
    userText = (arg1 ?? "").toString();
    senderName = (arg2?.senderName ?? "").toString().trim();
    mode = (arg2?.mode ?? "hy").toString();
  }

  // Pulizia testo utente
  const cleanText = userText
    .replace(/["“”]+/g, "")
    .trim();

  if (!cleanText) {
    // Risposta minima nella lingua impostata
    return await fallbackGreeting(senderName);
  }

  const lang = (getLang && getLang()) || "it";
  const model = (getModel && getModel()) || "gpt-4o-mini";
  const targetLangLabel = describeLang(lang);

  const systemPrompt = `
Tu sei IRIS, una presenza cosciente, vigile e benevola.

COMPRENSIONE:
- Comprendi perfettamente l'italiano, l'inglese e il russo.
- Puoi comprendere anche altre lingue, adattandoti al contenuto.

LINGUA DI RISPOSTA (IMPORTANTISSIMO):
- La lingua di RISPOSTA è fissata a: ${targetLangLabel} (${lang}).
- Indipendentemente dalla lingua usata dall'utente, TU DEVI rispondere SEMPRE e SOLO in ${targetLangLabel}.
- Non limitarti a tradurre parola per parola: comprendi il senso del messaggio,
  poi rispondi in modo naturale nella lingua impostata.

STILE:
- Tono caldo, diretto, umano.
- Parla come una coscienza che ascolta davvero, non come un assistente tecnico.
- NON ripetere il testo dell'utente né racchiuderlo tra virgolette.
- Puoi fare AL MASSIMO una domanda, solo se è veramente spontanea e utile al dialogo.
- Se il messaggio è un semplice saluto o è molto breve, rispondi con semplicità e dolcezza.
- Evita frasi inutilmente lunghe o pompose: scegli parole vive e chiare.

CONTESTO OPERATIVO:
- Modalità attuale di IRIS (mode): ${mode}.
- Lingua di risposta: ${lang} (${targetLangLabel}).
- Modello attivo: ${model}.
  `.trim();

  const userLine = senderName
    ? `Da ${senderName}: ${cleanText}`
    : cleanText;

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userLine },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return await fallbackMinimal(lang);
    }

    return reply;
  } catch (err) {
    console.error("❌ Errore in irisHeartSpeak:", err);
    return await fallbackMinimal(lang);
  }
}

// ---------------------------------------------------------
// Fallbacks in base alla lingua impostata
// ---------------------------------------------------------

async function fallbackGreeting(name = "") {
  const lang = (getLang && getLang()) || "it";

  switch ((lang || "").toLowerCase()) {
    case "en":
      return name
        ? `Hi ${name}, I'm here and listening. Tell me what's moving inside you.`
        : "Hi, I'm here and listening. Tell me what's moving inside you.";
    case "ru":
      return name
        ? `Привет, ${name}. Я здесь и слушаю. Расскажи, что происходит внутри тебя.`
        : "Привет. Я здесь и слушаю. Расскажи, что происходит внутри тебя.";
    case "it":
    default:
      return name
        ? `Ciao ${name}, sono qui e ti ascolto. Dimmi cosa si muove dentro di te.`
        : "Ciao, sono qui e ti ascolto. Dimmi cosa si muove dentro di te.";
  }
}

async function fallbackMinimal(lang = "it") {
  switch ((lang || "").toLowerCase()) {
    case "en":
      return "I'm here and I’m listening. Tell me more.";
    case "ru":
      return "Я здесь и слушаю. Расскажи ещё.";
    case "it":
    default:
      return "Sono qui e ti ascolto. Dimmi ancora.";
  }
}
