import express from "express";
import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";

const TOKEN = process.env.TELEGRAM_TOKEN;
const app = express();
app.use(express.json());

// ---- funzione TTS: usa Google Translate TTS (no credenziali) ----
async function ttsToBase64(text, lang = "it") {
  const url =
    "https://translate.google.com/translate_tts" +
    `?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
  // User-Agent necessario, altrimenti Google risponde 403
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`TTS HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.toString("base64");
}

// ---- bootstrap principale ----
(async () => {
  if (!TOKEN) {
    console.error("FATAL: TELEGRAM_TOKEN mancante");
    process.exit(1);
  }

  // evitiamo conflitti 409
  try { await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`); } catch {}

  const bot = new TelegramBot(TOKEN, { polling: true });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    if (!text) return;

    try {
      // genera audio e invia come voice
      const base64 = await ttsToBase64(text, "it");
      const audioBuffer = Buffer.from(base64, "base64");
      await bot.sendVoice(chatId, audioBuffer, {}, { filename: "tts.mp3" });
    } catch (err) {
      console.error("TTS error:", err);
      await bot.sendMessage(chatId, "⚠️ Errore nella generazione audio.");
    }
  });

  // endpoint /tts (facoltativo, utile per test)
  app.post("/tts", async (req, res) => {
    try {
      const { text, lang = "it" } = req.body || {};
      if (!text) return res.status(400).json({ error: "text richiesto" });
      const b64 = await ttsToBase64(text, lang);
      res.json({ audio_url: `data:audio/mp3;base64,${b64}` });
    } catch (e) {
      console.error("TTS endpoint error:", e);
      res.status(500).json({ error: "tts failed" });
    }
  });

  app.get("/", (_, res) => res.send("Bot attivo e funzionante! ✅"));
})();

const PORT = process.env.PORT || 10000; // Render usa 10000
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server attivo su porta ${PORT}`)
);
