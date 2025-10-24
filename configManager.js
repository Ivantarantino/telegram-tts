import fs from "fs";
import path from "path";

const CONFIG_PATH = path.resolve("./config.json");

const defaultConfig = {
  lang: "it",
  model: "gpt-4o-mini",
  mode: "hy",
  voice: { model: "openai", tone: "neutro" },
  weights: { sim: 0.5, imp: 0.3, rec: 0.2 },
  essence: null,
  lastEssence: "",
  version: "3.1.0",
};

const configManager = {
  loadConfig() {
    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
        console.log("🆕 File di configurazione creato:", CONFIG_PATH);
        return defaultConfig;
      }
      const data = fs.readFileSync(CONFIG_PATH, "utf8");
      console.log("⚙️ Configurazione trovata:", CONFIG_PATH);
      return JSON.parse(data);
    } catch (err) {
      console.error("❌ Errore nel leggere config.json:", err);
      return defaultConfig;
    }
  },

  saveConfig(config) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log("💾 Configurazione salvata:", config);
      return config;
    } catch (err) {
      console.error("❌ Errore nel salvare config.json:", err);
    }
  },

  resetConfig() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      console.log("🔄 Configurazione ripristinata:", defaultConfig);
      return defaultConfig;
    } catch (err) {
      console.error("❌ Errore nel ripristino config.json:", err);
      return defaultConfig;
    }
  },

  printConfig() {
    const config = this.loadConfig();
    console.log("📘 CONFIG ATTUALE:", config);
  },
};

export default configManager;