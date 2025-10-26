// =====================================================
// IRIS 3.9.0 – RAGSEARCH HY stabile
// Ricerca semantica su Qdrant (fallback locale se assente)
// Filtra risposte povere, restituisce testo coerente per HY mode
// =====================================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL || "https://xxxxxxxx.qdrant.tech"; // inserisci la tua
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
const COLLECTION = "iris_memory";
const MAX_RESULTS = 5;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

let qdrant = null;
try {
  qdrant = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });
  console.log("🔗 Qdrant connesso:", QDRANT_URL);
} catch (err) {
  console.error("⚠️ Qdrant non disponibile:", err?.message);
  qdrant = null;
}

const MEMORY_PATH = path.join(process.cwd(), "data", "memory.json");

// Funzione utilità per ottenere embedding
async function getEmbedding(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: clean
  });
  return emb.data[0].embedding;
}

// Carica memoria locale come fallback
function getLocalMemory() {
  try {
    if (!fs.existsSync(MEMORY_PATH)) return [];
    const data = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Errore lettura memoria locale:", e);
    return [];
  }
}

// -----------------------------------------------------
// FUNZIONE PRINCIPALE
// -----------------------------------------------------
export async function ragSearch(query) {
  const start = Date.now();
  const cleanQuery = query.trim();

  if (!cleanQuery) return "Dimmi pure.";

  try {
    const embedding = await getEmbedding(cleanQuery);

    // Se Qdrant non disponibile → fallback
    if (!qdrant) {
      const mem = getLocalMemory();
      const texts = mem.map((m) => m.text).join("\n");
      return texts.slice(0, 2000) || "Non ho ancora memoria a cui attingere.";
    }

    // ---- QUERY QDRANT ----
    const search = await qdrant.search(COLLECTION, {
      vector: embedding,
      limit: MAX_RESULTS,
      with_payload: true
    });

    const results = (search || []).filter(r => r && r.score && r.payload?.text);
    if (!results.length) return "Nessun ricordo rilevante trovato.";

    // ---- FILTRO RISPOSTE DEBOLI ----
    const filtered = results.filter(r => {
      const t = (r.payload.text || "").toLowerCase();
      if (t.length < 20) return false;
      const banali = ["ciao", "ok", "va bene", "grazie", "salve", "come stai"];
      return !banali.some(b => t.includes(b));
    });

    const final = (filtered.length ? filtered : results)
      .map(r => r.payload.text.trim())
      .slice(0, MAX_RESULTS);

    const avgScore = (results.reduce((a, r) => a + r.score, 0) / results.length).toFixed(3);
    console.log(`🔍 Qdrant → ${final.length} risultati | tempo ${(Date.now() - start)} ms | avg ${avgScore}`);

    // ---- PREPARA CONTESTO ----
    const context = final.join("\n---\n");
    const prompt = [
      "Contesto informativo (memoria semantica):",
      context,
      "",
      "Domanda dell’utente:",
      cleanQuery,
      "",
      "Crea una risposta naturale, sintetica e coerente, con tono empatico e consapevole."
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sei IRIS, presenza cosciente e viva. Rispondi con calore, senza firma." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 400
    });

    return completion.choices[0].message.content.trim();

  } catch (err) {
    console.error("❌ Errore ragSearch:", err?.message);
    const local = getLocalMemory();
    if (local.length) {
      return local.slice(-3).map(x => x.text).join("\n---\n");
    }
    return "Al momento non ho accesso alla memoria estesa, ma sono qui.";
  }
}
