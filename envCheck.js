import dotenv from "dotenv";
dotenv.config();

console.log("\n🔍 Verifica variabili ambiente:");

const required = [
  "OPENAI_API_KEY",
  "QDRANT_API_KEY",
  "QDRANT_URL",
  "QDRANT_COLLECTION",
  "TELEGRAM_TOKEN",
  "PORT"
];

for (const key of required) {
  if (process.env[key]) {
    console.log(`✅ ${key} = ${process.env[key].slice(0, 8)}...`);
  } else {
    console.log(`❌ ${key} = mancante`);
  }
}

