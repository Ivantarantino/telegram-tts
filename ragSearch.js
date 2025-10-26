// =====================================================
// IRIS 3.9 – ragSearch (HYBRID)
// Qdrant (iris_docs + iris_memory) + GPT synthesis
// - Recupera topK frammenti da Qdrant
// - Li fonde con GPT in una risposta viva
// =====================================================

import fetch from "node-fetch";
import OpenAI from "openai";

const QDRANT_URL = process.env.QDRANT_URL;         // es. https://xxxx.gcp.cloud.qdrant.io
const QDRANT_API_KEY = process.env.QDRANT_API_KEY; // la tua chiave
const EMBEDDING_MODEL = "text-embedding-3-small";  // 1536-dim
const TOP_K_DOCS = parseInt(process.env.RAG_TOPK || "4", 10);

const COLLECTIONS = [
  { name: "iris_docs",    weight: 1.0 },
  { name: "iris_memory",  weight: 0.8 },
  // se vuoi: { name: "iris_chat_history", weight: 0.5 },
];

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// -----------------------------------------------------
// Helpers
// -----------------------------------------------------
async function embedText(text) {
  const emb = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });
  return emb.data[0].embedding;
}

async function searchCollection({ collection, vector, limit }) {
  const url = `${QDRANT_URL}/collections/${collection}/points/search`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": QDRANT_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      vector,
      limit,
      with_payload: true
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Qdrant search error (${collection}): ${res.status} ${errText}`);
  }
  const json = await res.json();
  // json.result: [{ id, score, payload, vector? }]
  return json.result || [];
}

function cleanSnippet(s) {
  if (!s) return "";
  return s
    .replace(/\s+/g, " ")
    .replace(/\u0000/g, " ")
    .trim();
}

// -----------------------------------------------------
// Sintesi GPT (ibrida)
// -----------------------------------------------------
async function synthesizeAnswer({ userQuery, contexts, model = "gpt-4o-mini", lang = "it" }) {
  // Costruiamo un contesto breve e denso
  const joined = contexts.map((c, i) => `● [${i+1}] ${c.snippet}`).join("\n");

  const system = [
    "Sei IRIS: calda, presente, chiara. Parli in modo naturale, senza firme automatiche.",
    "Fondi i contesti forniti con il ragionamento tuo: non fare copia/incolla, ma integra.",
    "Se qualcosa non è nel contesto, puoi inferirlo con cautela, dichiarandolo come intuizione.",
    "Se la domanda non trova riscontro, dillo con onestà e proponi una via per approfondire."
  ].join(" ");

  const userPrompt = [
    lang === "it" ? "Domanda:" : "Question:",
    userQuery,
    "",
    lang === "it" ? "Contesti rilevanti (estratti):" : "Relevant contexts:",
    joined || "(nessun contesto trovato)",
    "",
    lang === "it"
      ? "Istruzioni: rispondi con tono umano, sintetico ma caldo. Se utile, cita tra parentesi [1], [2] i frammenti da cui attingi."
      : "Instructions: answer warmly and clearly. If helpful, cite snippets as [1], [2]."
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt }
    ]
  });

  const answer = completion.choices?.[0]?.message?.content?.trim() || "Dimmi pure.";
  return answer;
}

// -----------------------------------------------------
// Entry point pubblico
// -----------------------------------------------------
export async function ragSearch(userQuery, opts = {}) {
  const {
    topK = TOP_K_DOCS,
    model = "gpt-4o-mini",
    lang = "it",
    includeSources = false // se true, ritorna anche le fonti
  } = opts;

  if (!QDRANT_URL || !QDRANT_API_KEY) {
    console.warn("⚠️ Qdrant non configurato: variabili mancanti. Uso fallback GPT puro.");
    // fallback: solo GPT
    return await synthesizeAnswer({ userQuery, contexts: [], model, lang });
  }

  console.log(`🔍 RAG | query="${userQuery}" | topK=${topK}`);

  // 1) Embedding della query
  const queryVec = await embedText(userQuery);

  // 2) Cerca in ciascuna collection
  let allHits = [];
  for (const col of COLLECTIONS) {
    try {
      const hits = await searchCollection({
        collection: col.name,
        vector: queryVec,
        limit: topK
      });
      // log non rumoroso
      console.log(`🔎 Qdrant → ${hits.length} risultati da ${col.name}`);

      // Rimappa con clean e peso
      const mapped = hits
        .map(h => {
          const text = cleanSnippet(h?.payload?.text || h?.payload?.content || "");
          return {
            collection: col.name,
            score: h.score,       // valori più alti = più simile (dipende dalla config; se è distanza, inverti)
            weight: col.weight,
            snippet: text
          };
        })
        .filter(x => x.snippet && x.snippet.length > 40);

      allHits = allHits.concat(mapped);
    } catch (err) {
      console.error(`❌ Qdrant search fail (${col.name}):`, err.message);
    }
  }

  if (!allHits.length) {
    console.log("⚠️ Nessun contesto trovato in Qdrant. Passo a GPT puro.");
    return await synthesizeAnswer({ userQuery, contexts: [], model, lang });
  }

  // 3) Ponderazione semplice: score * weight (se score è similarity, moltiplica; se fosse distanza, useresti 1/score)
  // Nota: Qdrant di default restituisce "score" come similarity (più alto è meglio) quando distance=Cosine.
  const rescored = allHits.map(h => ({
    ...h,
    finalScore: h.score * h.weight
  }));

  // 4) Ordina e seleziona i migliori N (evita duplicati troppo simili)
  const best = rescored
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK);

  // 5) Sintesi GPT sui contesti
  const answer = await synthesizeAnswer({
    userQuery,
    contexts: best,
    model,
    lang
  });

  // 6) (opzionale) Allegare fonti
  if (includeSources) {
    const src = best.map((b, i) => `[#${i+1}] ${b.collection} | score=${b.finalScore.toFixed(3)}`).join("\n");
    return `${answer}\n\n—\nFonti:\n${src}`;
  }

  return answer;
}
