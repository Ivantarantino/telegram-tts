// =====================================================
// CONFIG MANAGER – IRIS 3.8.8f
// Gestione e normalizzazione config.json
// =====================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, "config.json");

const DEFAULTS = {
  mode: "hy",                 // books | free | hy
  language: "it",
  model: "gpt-4o-mini",
  voice: "gpt_openai",
  voice_mode: "it_female",
  lastEssence: "",
  version: "3.8.8f"
};

// 🔧 Normalizza vecchie strutture (es. versioni 3.1.0 / 3.8.6)
function normalizeConfig(raw) {
  const cfg = { ...raw };

  if (typeof cfg.voice === "object" && cfg.voice !== null) {
    cfg.voice_mode = cfg.voice_mode || cfg.voice.tone || DEFAULTS.voice_mode;
    cfg.voice = cfg.voice.model || DEFAULTS.voice;
  }

  for (const [key, val] of Object.entries(DEFAULTS)) {
    if (cfg[key] === undefined || cfg[key] === null || cfg[key] === "")
      cfg[key] = val;
  }

  // forza l’aggiornamento versione
  cfg.version = "3.8.8f";
  return cfg;
}

export function initConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULTS, null, 2));
      console.log(`🆕 File di configurazione creato: ${CONFIG_PATH}`);
      return;
    }

    const current = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    const normalized = normalizeConfig(current);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(normalized, null, 2));
    console.log("💾 Configurazione aggiornata:", normalized);
  } catch (err) {
    console.error("❌ initConfig error:", err);
  }
}

export function getConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return normalizeConfig(cfg);
  } catch {
    return { ...DEFAULTS };
  }
}

export function updateConfig(partial) {
  try {
    const current = getConfig();
    const next = normalizeConfig({ ...current, ...partial });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
    return next;
  } catch (err) {
    console.error("❌ updateConfig error:", err);
    return null;
  }
}

export function printConfig() {
  try {
    const cfg = getConfig();
    console.log("📘 CONFIG ATTUALE:", cfg);
  } catch (err) {
    console.error("❌ printConfig error:", err);
  }
}
