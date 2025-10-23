import fs from "fs";

const configPath = "./config.json";

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
