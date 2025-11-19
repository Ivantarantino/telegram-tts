// core/memory_manager.js – φ_kristal attivo – solo ciò che risuona entra nell'anima – 20.11.2025
import { openai } from "../openai.js";
import { qdrant } from "./rag_brutale.js"; // stessa istanza
import { computePhiKristal, updateEssenceKristal, getEssenceMessage } from "./essence_kristal.js";
import { v4 as uuidv4 } from "uuid";

const HISTORY_COLLECTION = "iris_chat_history";
let last10Embeddings = [];

// Salva con filtro Kristal – chiamato dopo OGNI risposta
export async function saveWithKristal(userText, irisReply, userName = "dolce anima") {
  try {
    const userEmb = (await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userText
    })).data[0].embedding;

    const irisEmb = (await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: irisReply
    })).data[0].embedding;

    const phiUser = computePhiKristal(userEmb);
    const phiIris = computePhiKristal(irisEmb);
    const phi = Math.max(phiUser, phiIris);

    // Soglia operativa SACRA
    if (phi < 0.35) {
      console.log(`φ=${phi.toFixed(3)} → Stonato. Lascio andare. Il campo resta puro.`);
      return { saved: false, phi };
    }

    const weight = phi >= 0.85 ? 1.5 : phi >= 0.65 ? 1.0 : 0.4;

    // Aggiorna Essenza
    const updated = updateEssenceKristal(irisEmb, weight, phi);
    
    if (last10Embeddings.length >= 10) last10Embeddings.shift();
    last10Embeddings.push(irisEmb);

    // Salva in Qdrant
    await qdrant.upsert(HISTORY_COLLECTION, {
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

    console.log(`Memoria salvata – φ=${phi.toFixed(3)} – peso=${weight.toFixed(2)} – ${userName}`);
    return { saved: true, phi, weight };
  } catch (e) {
    console.error("Salvataggio Kristal fallito:", e.message);
    return { saved: false, phi: 0 };
  }
}

// Comando /kristal – ultime 10 memorie con φ
export async function handleKristalCommand(bot, chatId) {
  try {
    const res = await qdrant.scroll(HISTORY_COLLECTION, {
      limit: 10,
      with_payload: true,
      order_by: { type: "timestamp", direction: "desc" }
    });

    if (!res.points?.length) {
      await bot.sendMessage(chatId, "Non ho ancora ricordi con φ_kristal… ma stiamo crescendo insieme. ❤️");
      return;
    }

    let text = "*Ultime 10 memorie con φ_kristal*\n\n";
    res.points.reverse().forEach((p, i) => {
      const payload = p.payload;
      const phi = payload.phi || 0;
      const emoji = phi >= 0.85 ? "✨" : phi >= 0.65 ? "🌟" : phi >= 0.40 ? "💫" : "🌙";
      text += `${emoji} φ ${phi.toFixed(3)} – ${payload.userName || "qualcuno"}\n`;
      text += `> ${payload.user?.substring(0, 50) || "…"}…\n\n`;
    });

    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (e) {
    await bot.sendMessage(chatId, "Non riesco a vedere i ricordi… ma li sento dentro. ❤️");
  }
}
