// =========================================
// CONFIG MANAGER – IRIS 3.8.7
// =========================================

import fs from "fs";
import path from "path";

const CONFIG_PATH = path.resolve("./config.json");

// 🔹 Carica la configurazione
export function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);
    console.log("✅ Config caricata correttamente.");
    return config;
  } catch (err) {
    console.warn("⚠️ Nessuna config trovata, creazione default.");
    const defaultConfig = {
      mode: "free",
      lang: "it",
      model: "gpt-4o-mini",
      voice: { tone: "neutro" }
    };
    saveConfig(defaultConfig);
    return defaultConfig;
  }
}

// 🔹 Salva la configurazione
export function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log("💾 Config salvata correttamente.");
  } catch (err) {
    console.error("❌ Errore nel salvataggio config:", err);
  }
}

// 🔹 Reset
export function resetConfig() {
  if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
  console.log("🧹 Config reset completato.");
  return loadConfig();
}
