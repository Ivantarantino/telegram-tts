// =============================================================
// IRIS 3.8.8 – Config Manager
// Gestisce lettura e aggiornamento del file di configurazione.
// =============================================================

import fs from "fs";

const CONFIG_PATH = "./config.json";

function initConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      telegram_bot_token: "INSERISCI_IL_TUO_TOKEN",
      mode: "hy",
      model: "iris",
      language: "it",
      weights: "default",
      voice_mode: "neutral"
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    console.log(`🆕 File di configurazione creato: ${CONFIG_PATH}`);
  }
}

function getConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH));
}

function updateConfig(newValues) {
  const config = getConfig();
  const updated = { ...config, ...newValues };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
}

export default { initConfig, getConfig, updateConfig };
