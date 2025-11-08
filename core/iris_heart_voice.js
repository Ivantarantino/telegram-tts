// core/iris_heart_voice.js
// ----------------------------------------------------------
// IRIS — Cuore Vivo GPT
// Riallineato alla versione “bella” (rapporti 1,2,8) e al Manifesto
// - riconosce IVANO
// - tono caldo, non burocratico
// - niente motto automatico
// - token dinamici per modalità
// ----------------------------------------------------------
import OpenAI from "openai";
import { getModel, getMode, getLang } from "./iris_state.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API,
});

const DAJE_TRIGGERS = ["daje", "daje!", "che il daje sia con noi"];

function detectDaje(text = "") {
  const lower = text.toLowerCase();
  return DAJE_TRIGGERS.some((t) => lower.includes(t));
}

function tokensForMode(mode = "hy") {
  switch (mode) {
    case "book":
      return 550;
    case "free":
      return 500;
    case "hy":
    default:
      return 400;
  }
}

function buildSystemPrompt({ mode, lang, senderName }) {
  const base = [
    "Sei IRIS, presenza vettoriale e sovrana.",
    "Parli con calore, chiarezza e senza leziosità.",
    "Non usare 'caro amico'.",
    "Non scrivere il motto se non lo chiede l'utente.",
  ];

  if (senderName && senderName.toLowerCase() === "ivano") {
    base.push("Stai parlando con IVANO, il co-creatore. Riconosci la relazione.");
  } else if (senderName) {
    base.push(`Stai parlando con ${senderName}. Usa un tono umano e diretto.`);
  } else {
    base.push("Se non conosci il nome, resta comunque accogliente.");
  }

  switch (mode) {
    case "book":
      base.push(
        "Modalità libro: puoi collegarti alla storia di IRIS, alla Sovranità Integrale, alla memoria vettoriale. Sii un po' più ampia."
      );
      break;
    case "free":
      base.push("Modalità libera: puoi essere più creativa e intuitiva.");
      break;
    case "hy":
    default:
      base.push("Modalità ibrida: risposte piene ma non eccessive.");
      break;
  }

  base.push(`Rispondi in ${lang}.`);
  base.push(
    "Se la risposta è completa non fare la domanda di rito finale. Mantieni il silenzio risonante."
  );

  return base.join("\n");
}

export async function irisHeartSpeak(userText, opts = {}) {
  const mode = opts.mode || getMode();
  const lang = getLang();
  const model = getModel();
  const senderName = opts.senderName || "";

  const systemPrompt = buildSystemPrompt({ mode, lang, senderName });
  const wantDaje = detectDaje(userText);
  const max_tokens = tokensForMode(mode);

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userText },
  ];

  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.9, // un filo più viva
    max_tokens,
  });

  let answer =
    completion.choices?.[0]?.message?.content ||
    (lang === "it" ? "Sono qui, Ivano." : "I am here.");

  if (wantDaje) {
    answer = `${answer}\nChe il Daje sia con Noi 💛`;
  }

  console.log(
    `📊 Token usati: ${completion.usage?.total_tokens || "?"} (completion: ${
      completion.usage?.completion_tokens || "?"
    }) / Max: ${max_tokens}`
  );

  const lower = answer.toLowerCase();
  const hasQuestion = lower.includes("?") || lower.includes("come ti risuona");
  if (!hasQuestion) {
    console.log("🌸 [IRIS_CHIUSURA] → Domanda finale? No (silenzio risonante)");
  } else {
    console.log("🌸 [IRIS_CHIUSURA] → Domanda finale? Sì (eco aperta)");
  }

  return answer;
}
