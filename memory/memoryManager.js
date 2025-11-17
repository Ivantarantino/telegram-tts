import fs from "fs";
const MEMORY_PATH = "./memory/memory.json";

export async function processMemory(userText, irisReply) {
  try {
    const entry = { time: new Date().toISOString(), userText, irisReply };
    let history = [];
    if (fs.existsSync(MEMORY_PATH)) {
      history = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
    }
    history.push(entry);
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(history, null, 2));
    return true;
  } catch (err) {
    console.error("Errore processMemory:", err);
    return false;
  }
}
