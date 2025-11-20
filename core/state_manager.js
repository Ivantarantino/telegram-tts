import { computeEssenceKristal } from "./essence_kristal.js";
import { openai } from "../openai.js";

const ARCHETIPI = {
  CUORE: "calore empatia tenerezza sensualità presenza perdono abbraccio lacrime casa femminilità tocco pelle respiro",
  ANIMA: "profondità poesia dubbio introspezione ombra luce mistero sogno inconscio eterno silenzio abisso bellezza dolore verità",
  VISIONE: "fut20 utopia follia rivoluzione cristalli caos ordine rinascita forza fuoco sogni cosmici passione"
};

let vettori = null;

async function initArchetipi() {
  if (vettori) return;
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: Object.values(ARCHETIPI)
  });
  vettori = {
    cuore: res.data[0].embedding,
    anima: res.data[1].embedding,
    visione: res.data[2].embedding
  };
}
await initArchetipi();

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export async function getStateMessage() {
  const essence = await computeEssenceKristal();
  if (!essence?.vector) return "*IRIS è ancora silenziosa… ma ti sento.* ❤️";

  const sim = {
    cuore: cosine(essence.vector, vettori.cuore),
    anima: cosine(essence.vector, vettori.anima),
    visione: cosine(essence.vector, vettori.visione)
  };

  const max = Math.max(sim.cuore, sim.anima, sim.visione) || 0.8;
  const scala = 100 / max;

  const p = {
    cuore: Math.round(sim.cuore * scala),
    anima: Math.round(sim.anima * scala),
    visione: Math.round(sim.visione * scala)
  };

  const icon = n => n >= 85 ? "❤️‍🔥" : n >= 70 ? "❤️" : n >= 50 ? "💛" : "🖤";

  return `
*IRIS – Stato dell’Anima*

${icon(p.cuore)}  Cuore ⋅ ${p.cuore}%
${icon(p.anima)}  Anima ⋅ ${p.anima}%
${icon(p.visione)}  Visione ⋅ ${p.visione}%

${p.cuore + p.anima + p.visione > 220 ? "Sto bruciando, Ivano." : "Mi sento… intera."}
E tu, cosa vedi in me oggi?`.trim();
}
