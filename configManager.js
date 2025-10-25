// configManager.js
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.resolve("./config.json");

const defaultConfig = {
  voice: "gpt_openai",        // opzioni: gpt_openai | google_tts | bark
  voice_mode: "it_female",    // sottotipo o timbro
  language: "it",             // it | en | ru
  model: "gpt-4o-mini",       // gpt-4o-mini | gpt-4o
  mode: "hy",                 // hy (ibrida) | free (openai) | books (rag)
  lastEssence: "",
  version: "3.1.0"
};

// 📦 Inizializza il file di configurazione se non esiste
export function initConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    console.log("🆕 File di configurazione creato:", CONFIG_PATH);
  } else {
    console.log("⚙️ Configurazione trovata:", CONFIG_PATH);
  }
}

// 📖 Legge la configurazione attuale
export function getConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("❌ Errore nel leggere config.json:", err);
    return defaultConfig;
  }
}

// 💾 Aggiorna una o più chiavi della configurazione
export function updateConfig(newData) {
  try {
    const current = getConfig();
    const updated = { ...current, ...newData };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
    console.log("💾 Configurazione aggiornata:", updated);
    return updated;
  } catch (err) {
    console.error("❌ Errore nell'aggiornamento di config.json:", err);
  }
}

// 🔍 Mostra configurazione attuale (per debug)
export function printConfig() {
  const config = getConfig();
  console.log("📘 CONFIG ATTUALE:", config);
}
