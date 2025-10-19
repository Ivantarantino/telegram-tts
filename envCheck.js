// ======================================
// 🧪 IRIS — Test variabili ambiente
// ======================================
import dotenv from "dotenv";
dotenv.config();

console.log("🔍 Verifica variabili ambiente:");

const vars = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  QDRANT_API_KEY: process.env.QDRANT_API_KEY,
  QDRANT_URL: process.env.QDRANT_URL,
  QDRANT_COLLECTION: process.env.QDRANT_COLLECTION,
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  PORT: process.env.PORT,
};

let allOk = true;

for (const [key, value] of Object.entries(vars)) {
  if (value) {
    console.log(`✅ ${key} = ${value.slice(0, 10)}...`);
  } else {
    console.log(`❌ ${key} NON trovata!`);
    allOk = false;
  }
}

if (allOk) console.log("✨ Tutte le variabili ambiente sono correttamente configurate!");
else console.log("⚠️ Alcune variabili mancano o non sono caricate.");
