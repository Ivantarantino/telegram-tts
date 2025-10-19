// ======================================
// 🧠 IRIS — Test diretto del motore RAG
// ======================================
import dotenv from "dotenv";
import { answerWithRAG } from "./ragSearch.js";

dotenv.config();

const query = process.argv.slice(2).join(" ").trim() || "Qual è lo scopo del progetto IRIS?";

(async () => {
  try {
    console.log("🧪 Test RAG — Query:", query);
    const risposta = await answerWithRAG(query);
    console.log("\n💬 RISPOSTA:\n", risposta);
  } catch (err) {
    console.error("❌ Errore test RAG:", err?.message || err);
    process.exit(1);
  }
})();
