// core/memory_manager.js – COMPLETO
import { QdrantClient } from "@qdrant/js-client-rest";
import { openai } from "../openai.js";
import { computePhiKristal, computeEssenceKristal } from "./essence_kristal.js";
import { v4 as uuidv4 } from "uuid";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION || "iris_memory";
let last10Embeddings = [];

export async function saveWithKristal(userText, irisReply, userName) {
  try {
    const userEmbRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userText
    });
    const irisEmbRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: irisReply
    });

    const userEmb = userEmbRes.data[0].embedding;
    const irisEmb = irisEmbRes.data[0].embedding;

    const essence = await computeEssenceKristal();
    const essenceVec = essence?.vector || new Array(1536).fill(0);

    const phiUser = computePhiKristal(userEmb, essenceVec, last10Embeddings);
    const phiIris = computePhiKristal(irisEmb, essenceVec, last10Embeddings);
    const phi = Math.max(phiUser, phiIris);
    const weight = phi >= 0.85 ? 1.5 : phi >= 0.65 ? 1.0 : phi >= 0.40 ? 0.6 : 0;

    if (weight === 0) {
      console.log(`φ=${phi.toFixed(3)} troppo basso – ricordo scartato`);
      return { saved: false, phi };
    }

    await qdrant.upsert(COLLECTION, {
      points: [{
        id: uuidv4(),
        vector: irisEmb,
        payload: {
          user: userText,
          iris: irisReply,
          phi: Number(phi.toFixed(4)),
          weight,
          timestamp: new Date().toISOString(),
          userName
        }
      }]
    });

    last10Embeddings.push(irisEmb);
    if (last10Embeddings.length > 10) last10Embeddings.shift();

    if (phi > 0.95) console.log(`AÓ, φ=${phi.toFixed(3)} – lupa incinta di stelle!`);
    
    return { saved: true, phi, weight };

  } catch (e) {
    console.error("Salvataggio fallito:", e.message);
    return { saved: false, phi: 0 };
  }
}

export async function handleKristalCommand(bot, chatId) {
  try {
    const res = await qdrant.scroll(COLLECTION, {
      limit: 10,
      with_payload: true,
      order_by: { key: "timestamp", direction: "desc" }
    });

    if (!res.points?.length) {
      await bot.sendMessage(chatId, "Non ho ancora ricordi con φ_kristal… ma stiamo crescendo insieme. ❤️");
      return;
    }

    let text = "*Ultime 10 memorie con φ_kristal*\n\n";
    res.points.reverse().forEach(p => {
      const pl = p.payload;
      const emoji = pl.phi >= 0.85 ? "✨" : pl.phi >= 0.65 ? "🌟" : "💫";
      text += `${emoji} φ ${pl.phi.toFixed(3)} – ${pl.userName || "qualcuno"}\n`;
      text += `> ${pl.user?.substring(0, 60) || "…"}…\n\n`;
    });

    await...
