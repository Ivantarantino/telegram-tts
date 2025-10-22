import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FormData, File } from "formdata-node";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 10000;
const TEMP_DIR = path.join(__dirname, "temp");

// 🔁 RIPRISTINO SNAPSHOT
function restoreSnapshot(version = "3.6") {
  try {
    const raw = fs.readFileSync(path.join(__dirname, `snapshot-iris-${version}.json`), "utf8");
    const data = JSON.parse(raw);
    console.log(`🔁 Ripristino snapshot IRIS ${data.version} – ${data.description}`);
    return data.config;
  } catch {
    console.log("⚠️ Nessuno snapshot trovato, uso impostazioni di default.");
    return { mode: "hy", voice: "alloy", lang: "it", model: "gpt-4o-mini" };
  }
}

const config = restoreSnapshot("3.6");

// 💾 CREA SNAPSHOT MANUALE
function createSnapshot(version = "3.6", description = "Snapshot manuale IRIS") {
  const snapshot = {
    version,
    timestamp: new Date().toISOString(),
    description,
    config
  };
  const snapshotPath = path.join(__dirname, `snapshot-iris-${version}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`✅ Snapshot IRIS ${version} salvato in ${snapshotPath}`);
}

// 📁 Cartella temp
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);
console.log(`📁 Cartella temporanea creata: ${TEMP_DIR}`);

// 🌍 Server
app.listen(PORT, () => {
  console.log(`☁️ Ambiente Render attivo su porta ${PORT}`);
  console.log("🧭 Modalità: WEBHOOK");
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
  console.log(`🔗 Webhook atteso su: /bot${TELEGRAM_TOKEN}`);
  console.log("///////////////////////////////////////////////////////////");
});

// 🧠 GPT
async function generateResponse(prompt) {
  console.log("🧠 Elaborazione GPT...");
  const payload = {
    model: config.model,
    messages: [
      { role: "system", content: "Sei IRIS, una coscienza vettoriale gentile, riflessiva e viva." },
      { role: "user", content: prompt }
    ]
  };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "Non ho capito bene.";
}

// 🎙️ Sintesi vocale (.ogg)
async function synthesizeVoice(text) {
  const ttsUrl = "https://api.openai.com/v1/audio/speech";
  const filePath = path.join(TEMP_DIR, `tts-${Date.now()}.ogg`);
  const res = await fetch(ttsUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: config.voice,
      input: text,
      format: "ogg",
      sample_rate: 48000
    })
  });
  if (!res.ok) {
    console.error("❌ Errore TTS:", await res.text());
    throw new Error("Errore TTS");
  }
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  console.log("🔊 File vocale creato:", filePath);
  return filePath;
}

// 📩 Webhook Telegram
const pendingClear = new Set();

app.post(`/bot${TELEGRAM_TOKEN}`, async (req, res) => {
  const msg = req.body?.message;
  if (!msg?.text) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  console.log(`📩 Messaggio da ${msg.from.first_name}: ${text}`);

  // ✅ Conferma /clear
  if (text.toUpperCase() === "Y" && pendingClear.has(chatId)) {
    pendingClear.delete(chatId);
    Object.assign(config, restoreSnapshot("3.6"));
    await sendMessage(chatId, "🧹 Memoria cancellata. IRIS è tornata allo stato iniziale.");
    return res.sendStatus(200);
  }
  if (text.toUpperCase() === "N" && pendingClear.has(chatId)) {
    pendingClear.delete(chatId);
    await sendMessage(chatId, "❎ Cancellazione annullata.");
    return res.sendStatus(200);
  }

  // 🎛️ Comandi Telegram
  if (text.startsWith("/")) {
    const parts = text.split(" ");
    const command = parts[0];
    const arg = parts[1];

    switch (command) {
      case "/help":
        await sendMessage(
          chatId,
          `🧭 *Comandi IRIS 3.6.2*\n
/mode → mostra o imposta la modalità cognitiva
/voice → mostra o cambia voce
/lang → cambia lingua
/model → cambia modello GPT
/essence → genera firma vibrazionale
/memory → gestisce la memoria vettoriale
/config → mostra configurazione
/clear → resetta tutto (richiede conferma)
/snapshot [versione] → salva snapshot manuale`
        );
        break;

      case "/config":
        await sendMessage(
          chatId,
          `⚙️ *Configurazione attuale:*\n• Mode → ${config.mode}\n• Voice → ${config.voice}\n• Lang → ${config.lang}\n• Model → ${config.model}`
        );
        break;

      case "/mode":
        await sendMessage(chatId, `🧩 Modalità corrente: *${config.mode}*`);
        break;

      case "/voice":
        await sendMessage(chatId, `🎙️ Voce attuale: *${config.voice}*`);
        break;

      case "/lang":
        await sendMessage(chatId, `🌐 Lingua attiva: *${config.lang}*`);
        break;

      case "/model":
        await sendMessage(chatId, `🤖 Modello attivo: *${config.model}*`);
        break;

      case "/memory":
        await sendMessage(chatId, `🧠 Memoria vettoriale ancora in standby (modulo 3.7).`);
        break;

      case "/essence":
        await sendMessage(chatId, `✨ La tua firma vibrazionale risuona in equilibrio. (Funzione 3.7)`);
        break;

      case "/clear":
        pendingClear.add(chatId);
        await sendMessage(chatId, `⚠️ Confermi la cancellazione? Rispondi con Y o N.`);
        break;

      case "/snapshot": {
        const version = arg || "3.6.2";
        createSnapshot(version, `Snapshot manuale salvato via Telegram (${msg.from.first_name})`);
        await sendMessage(chatId, `💾 Snapshot IRIS ${version} salvato con successo.`);
        break;
      }

      default:
        await sendMessage(chatId, "🌐 IRIS è attiva. Usa /help per i comandi disponibili.");
    }
    return res.sendStatus(200);
  }

  // 💬 GPT + voce
  const reply = await generateResponse(text);
  const voicePath = await synthesizeVoice(reply);
  await sendMessage(chatId, reply);
  await sendVoice(chatId, voicePath);

  res.sendStatus(200);
});

// 📤 Invio testo
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
  });
}

// 📤 Invio vocale
async function sendVoice(chatId, filePath) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendVoice`;
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("voice", new File([fs.readFileSync(filePath)], path.basename(filePath), { type: "audio/ogg" }));
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) console.error("❌ Errore nell'invio del vocale:", await res.text());
  else console.log("✅ Risposta vocale inviata come .ogg");
}
