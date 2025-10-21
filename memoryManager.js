import fs from "fs";
import path from "path";

const memoryDir = "./data";
const memoryFile = path.resolve(`${memoryDir}/memory.json`);

export async function processMemory(message, response) {
  try {
    if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });

    let data = [];
    if (fs.existsSync(memoryFile)) {
      const raw = fs.readFileSync(memoryFile, "utf8");
      data = JSON.parse(raw);
    }

    const newEntry = {
      date: new Date().toISOString(),
      text: message,
      reply: response
    };

    data.push(newEntry);

    // Limita la memoria a 200 elementi per non farla crescere all’infinito
    if (data.length > 200) data = data.slice(-200);

    fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2));
    console.log("💾 Memoria aggiornata:", message.slice(0, 60));
    return true;
  } catch (err) {
    console.error("❌ Errore in processMemory:", err.message);
    return false;
  }
}
