import fs from "fs";

const configPath = "./config.json";

// ✅ Funzione compatibile con le versioni precedenti
export function initConfig(defaultConfig = {
  voice: "gpt_openai",
  voice_mode: "it_female",
  language: "it",
  model: "gpt-4o-mini",
  mode: "hy",
  lastEssence: "",
  version: "3.1.0",
  w_sim: 0.5,
  w_imp: 0.3,
  w_rec: 0.2
}) {
  ensureConfigFileExists(defaultConfig);
}

// ✅ Crea file di configurazione se non esiste
export function ensureConfigFileExists(defaultConfig) {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(`🆕 File di configurazione creato: ${configPath}`);
  }
}

// ✅ Legge configurazione
export function loadConfig() {
  try {
    const data = fs.readFileSync(configPath);
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Errore durante il caricamento della configurazione:", error);
    return {};
  }
}

// ✅ Salva configurazione
export function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("❌ Errore durante il salvataggio della configurazione:", error);
  }
}
