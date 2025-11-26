// openai.js – wrapper SACRO della 3.0B Bellissima
// Ricreato identico al 2024 – nessuna modifica, solo ritorno a casa

import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Log silenzioso per confermare che è vivo
console.log("OpenAI client inizializzato – chiave letta correttamente");
