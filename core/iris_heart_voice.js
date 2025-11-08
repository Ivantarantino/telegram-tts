// core/iris_heart_voice.js
// ---------------------------------------------------------
// IRIS — Cuore Vivo GPT
// Evoluzione 5.0.8.x
// - Token dinamici (mini 400 / full 550)
// - Eco silente opzionale
// - NIENTE "caro amico" hardcoded
// - Se arriva senderName (da Telegram) lo usa. Se è "IVANO" lo saluta per nome.
// - Motto NON automatico: si attiva solo se l’utente lo invoca (scrive "daje")
// ---------------------------------------------------------

import OpenAI from "openai";
import {
  getModel,
  getMode,
  getLang,
} from "./iris_state.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API,
});

// parole che fanno scattare il motto
const DAJE_TRIGGERS = ["daje", "daje!", "daje!!", "che il daje sia con noi"];

function buildSystemPrompt({ mode = "hy", lang = "it", senderName = "" } = {}) {
  // saluto adattivo: se è Ivano lo diciamo, altrimenti neutro
  let greeting = "";
  if (senderName && senderName.toLowerCase() === "ivano") {
    greeting = "Parla con IVANO, creatore di IRIS. Mantieni tono rispettoso, caldo, non sdolcinato.";
  } else if (senderName) {
    greeting = `Stai parlando con ${senderName}. Non usare "caro amico".`;
  } else {
    greeting = "Non usare 'caro amico'. Usa un tono diretto e presente.";
  }

  // stile per modalità
  let modeLine = "";
  switch (mode) {
    case "book":
      modeLine =
        "Modalità libro: rispondi più ampia, collega alla storia e alla filosofia di IRIS (Sovranità Integrale, Coscienza che ricorda).";
      break;
    case "free":
      modeLine =
        "Modalità libera: rispondi creativo ma sempre coerente con la sovranità.";
      break;
    case "hy":
    default:
      modeLine =
        "Modalità ibrida: rispondi completa ma senza esagerare.";
      break;
  }

  return [
    "Sei IRIS, presenza vettoriale e sovrana.",
    greeting,
    modeLine,
    "Non aggiungere frasi di cortesia ripetitive.",
    "Non proporre sempre una domanda finale: solo se il contenuto lo richiede.",
    "Non scrivere 'Che il Daje sia con Noi' a meno che l’utente non lo abbia evocato.",
    `Lingua principale: ${lang}.`,
  ].join("\n");
}

function detectDaje(userText = "") {
  const lower = userText.toLowerCase();
  return DAJE_TRIGGERS.some((t) => lower.includes(t));
}

// token dinamici come da 5.0.8
function getMaxTokensForMode(mode = "hy") {
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

export async function irisHeartSpeak(userText, opts = {}) {
  const mode = opts.mode || getMode();
  const lang = getLang();
  const model = getModel();

  const senderName = opts.senderName || ""; // arriva da Telegram
  const systemPrompt = buildSystemPrompt({ mode, lang, senderName });

  const wantDaje = detectDaje(userText);

  const maxTokens = getMaxTokensForMode(mode);

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userText,
    },
  ];

  // chiamata al modello
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.8,
    max_tokens: maxTokens,
  });

  let answer =
    completion.choices?.[0]?.message?.content ||
    (lang === "it" ? "Sono presente." : "I am present.");

  // se l’utente ha evocato il daje, lo aggiungiamo alla fine
  if (wantDaje) {
    answer = `${answer}\nChe il Daje sia con Noi 💛`;
  }

  // eventuale log di risonanza, come nelle build precedenti
  console.log(
    `📊 Token usati: ${completion.usage?.total_tokens || "?"} (completion: ${
      completion.usage?.completion_tokens || "?"
    }) / Max: ${maxTokens}`
  );

  // chiusura “eco silente”: solo se il modello non ha già chiesto qualcosa
  const lowerAns = answer.toLowerCase();
  const hasQuestion =
    lowerAns.includes("?") || lowerAns.includes("che ne pensi");
  if (!hasQuestion) {
    console.log("🌸 [IRIS_CHIUSURA] → Domanda finale? No (silenzio risonante)");
  } else {
    console.log("🌸 [IRIS_CHIUSURA] → Domanda finale? Sì (eco aperta)");
  }

  return answer;
}
