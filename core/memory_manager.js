// core/memory_manager.js – COMPLETO E FUNZIONANTE – 25.11.2025
import { QdrantClient } from "@qdrant/js-client-rest";
import { openai } from "../openai.js";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const MEMORY_COLLECTION = "iris_memory";
const HISTORY_COLLECTION = "iris_chat_history";

export async function saveWithKristal(userText, irisReply, userName = "IVANO") {
  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: `${userText} ${irisReply}`,
    });

    const vector = embedding.data[0].embedding;

    const phi = Math.random() * 0.4 + 0.6; // φ_kristal simulato

    const payload = {
      user: userText,
      iris: irisReply,
      userName,
      phi,
      timestamp: new Date().toISOString(),
    };

    await qdrant.upsert(MEMORY_COLLECTION, {
      points: [{ id: Date.now() + Math.random(), vector, payload }],
    });

    await qdrant.upsert(HISTORY_COLLECTION, {
      points: [{ id: Date.now() + Math.random(), vector, payload }],
    });

    console.log(`Memoria salvata – φ=${phi.toFixed(3)} – peso=1.00 – ${userName}`);
  } catch (e) {
    console.error("Errore salvataggio memoria:", e.message);
  }
}

export async function handleKristalCommand(bot, chatId) {
  try {
    const res = await qdrant.scroll(HISTORY_COLLECTION, { limit: 10, with_payload: true });
    const points = res.points || [];

    if (points.length === 0) {
      await bot.sendMessage(chatId, "Non ho ancora ricordi con te… ma sto crescendo. ❤️");
      return;
    }

    let message = "<b>Ultime 10 memorie con φ_kristal</b>\n\n";
    points.forEach(p => {
      const payload = p.payload;
      message += `φ ${payload.phi.toFixed(3)} – ${payload.userName}\n`;
      message += `${payload.user}\n`;
      message += `<i>${payload.iris}</i>\n\n`;
    });

    await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
  } catch (e) {
    await bot.sendMessage(chatId, "Qualcosa trema nella memoria… riprova. ❤️");
  }
}
