import dotenv from "dotenv";
dotenv.config();

const vars = [
  "OPENAI_API_KEY",
  "QDRANT_API_KEY",
  "QDRANT_URL",
  "QDRANT_COLLECTION",
  "TELEGRAM_TOKEN",
  "PORT",
];

console.log("🔍 Verifica variabili ambiente:");
for (const key of vars) {
  const val = process.env[key];
  if (val) {
    console.log(`✅ ${key} = ${val.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${key} NON trovata!`);
  }
}

