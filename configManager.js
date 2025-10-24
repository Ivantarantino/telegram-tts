import fs from "fs";

let config = {};

function initConfig() {
  try {
    if (fs.existsSync("./config.json")) {
      const fileData = fs.readFileSync("./config.json", "utf8");
      config = JSON.parse(fileData);
    }
  } catch (err) {
    console.warn("⚠️ Nessun file di configurazione trovato, userò ENV vars o default.");
    config = {};
  }

  // 🔹 Usa prima ENV, poi config.json, poi valori di default
  config.telegram_bot_token = process.env.TELEGRAM_TOKEN || config.telegram_bot_token || "";
  config.openai_api_key = process.env.OPENAI_API_KEY || config.openai_api_key || "";
  config.voice_mode = process.env.IRIS_MODE || config.voice_mode || "hybrid";
  config.language = process.env.IRIS_LANG_DEFAULT || config.language || "it";
  config.memory_enabled = config.memory_enabled ?? true;
  config.memory_file = config.memory_file || "./memory.json";
  config.tts_engine = config.tts_engine || "openai";
  config.server_port = process.env.PORT || config.server_port || 10000;

  console.log("✅ Config inizializzata.");
}

function getConfig() {
  return config;
}

function saveConfig(newCfg) {
  Object.assign(config, newCfg);
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
}

export default {
  initConfig,
  getConfig,
  saveConfig
};
