import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// 🔹 Funzione principale per la ricerca semantica (RAG)
async function query(text, cfg) {
  try {
    const endpoint = process.env.RAG_ENDPOINT || "http://localhost:8000/query";
    const response = await axios.post(endpoint, { text, cfg });
    return response.data || { result: "Nessuna risposta trovata." };
  } catch (error) {
    console.error("❌ Errore in ragSearch.query:", error.message);
    return { result: "Errore durante la ricerca semantica." };
  }
}

// ✅ Export compatibile con entrambi i tipi di import
export default { query };
export { query };
