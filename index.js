// IRIS 3.7.0 – voce OGG, comandi Telegram stabili
// Requisiti ENV: TELEGRAM_TOKEN, OPENAI_API_KEY, PORT (Render impone 10000)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { OpenAI } from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== ENV ======
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 10000;
if (!BOT_TOKEN) throw new Error("Missing TELEGRAM_TOKEN");
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

// ====== CLIENTS / PATHS ======
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const app = express();
app.use(express.json({ limit: "10mb" }));

const TEMP_DIR = path.join(__dirname, "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
ffmpeg.setFfmpegPath(ffmpegStatic); // usa ffmpeg-static

// ====== STATO VOLATILE (per chat) ======
const state = new Map(); // chatId -> { mode, voice, lang, model, confirm }
const defaults = { mode: "hy", voice: "openai:alloy", lang: "it", model: "gpt-4o-mini" };

function getChatState(chatId) {
  if (!state.has(chatId)) state.set(chatId, { ...defaults });
  return state.get(chatId);
}

function setChatState(chatId, patch) {
  const cur = getChatState(chatId);
  state.set(chatId, { ...cur, ...patch });
}

// ====== HELP TEXT ======
const helpText =
`🧭 *Comandi IRIS 3.7*

/mode            → mostra o imposta modalità (free | books | hy)
/voice           → mostra o imposta voce (openai:alloy | openai:verse | google:it-std | bark:default)
/lang            → mostra o imposta lingua (it | en | ru)
/model           → mostra o imposta modello (gpt-4o-mini | gpt-4o)
/memory          → (preview) mostra stato memoria vettoriale
/clear           → reset configurazione (richiede conferma Y/N)
/config          → mostra configurazione attuale
/help            → questo menu

_Esempi_:
- /mode hy
- /lang en
- /model gpt-4o
- /voice openai:alloy`;

// ====== UTIL ======
async function tgSendMessage(chatId, text, options = {}) {
  const payload = { chat_id: chatId, text, parse_mode: "Markdown", ...options };
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function tgSendVoice(chatId, oggPath, caption) {
  // Telegram preferisce /sendVoice per OGG/Opus (note style)
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("voice", new Blob([fs.readFileSync(oggPath)]), path.basename(oggPath));
  if (caption) form.append("caption", caption);
  await fetch(`${TELEGRAM_API}/sendVoice`, { method: "POST", body: form });
}

function normalizeCmd(text = "") {
  const parts = text.trim().split(/\s+/);
  const cmd = (parts[0] || "").toLowerCase();
  const arg = parts[1] ? parts[1].toLowerCase() : "";
  return { cmd, arg, parts };
}

// TTS: OpenAI → MP3 → OGG/Opus (robusto su Telegram)
async function synthToOgg({ text, lang = "it", voiceKey = "openai:alloy" }) {
  // Oggi supportiamo solo provider openai:*; altri provider placeholder.
  const [provider, voiceName = "alloy"] = voiceKey.split(":");
  if (provider !== "openai") {
    // Fallback temporaneo: forziamo openai finché non integriamo google/bark
    // Manteniamo lo stesso voiceName se valido.
  }

  const mp3Path = path.join(TEMP_DIR, `tts-${Date.now()}.mp3`);
  const oggPath = mp3Path.replace(/\.mp3$/, ".ogg");

  // 1) genera MP3
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: voiceName || "alloy",
    input: text,
  });
  const buf = Buffer.from(await speech.arrayBuffer());
  fs.writeFileSync(mp3Path, buf);

  // 2) converti in OGG/Opus (48kHz, mono)
  await new Promise((resolve, reject) => {
    ffmpeg(mp3Path)
      .audioCodec("libopus")
      .audioChannels(1)
      .audioFrequency(48000)
      .format("ogg")
      .outputOptions(["-vbr on", "-compression_level 10"])
      .on("end", resolve)
      .on("error", reject)
      .save(oggPath);
  });

  // 3) pulizia MP3
  fs.unlink(mp3Path, () => {});
  return oggPath;
}

async function respondWithTTS(chatId, text, cfg) {
  try {
    const ogg = await synthToOgg({ text, lang: cfg.lang, voiceKey: cfg.voice });
    await tgSendVoice(chatId, ogg);
    fs.unlink(ogg, () => {});
  } catch (e) {
    // In caso di problemi audio, almeno inviamo testo.
    await tgSendMessage(chatId, text);
  }
}

async function runGPT(prompt, cfg) {
  const sys = [
    `Sei IRIS. Stile caldo ma pulito. Lingua: ${cfg.lang}.`,
    `Modalità: ${cfg.mode} (free=solo modello, books=rigido su fonti RAG, hy=ibrida; NB: se non è integrato RAG, comportati come free ma mantieni tono bilanciato).`,
    `Voce: ${cfg.voice}.`,
  ].join(" ");
  const completion = await openai.chat.completions.create({
    model: cfg.model || "gpt-4o-mini",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
  });
  return completion.choices?.[0]?.message?.content?.trim() || "🌐 IRIS è attiva.";
}

// ====== ROUTER TELEGRAM ======
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    const msg = update?.message || update?.edited_message;
    const chatId = msg?.chat?.id;
    const text = msg?.text?.trim();
    if (!chatId || !text) return res.sendStatus(200);

    const cfg = getChatState(chatId);
    const { cmd, arg, parts } = normalizeCmd(text);

    // Conferma pendente per /clear
    if (cfg.confirm === "clear" && /^[YyNn]$/.test(text)) {
      if (text.toLowerCase() === "y") {
        state.set(chatId, { ...defaults });
        await tgSendMessage(chatId, "♻️ Reset eseguito. Config riportata ai valori iniziali.");
      } else {
        await tgSendMessage(chatId, "❎ Annullato. Nessuna modifica applicata.");
      }
      setChatState(chatId, { confirm: undefined });
      return res.sendStatus(200);
    }

    // ===== Comandi =====
    if (cmd.startsWith("/")) {
      switch (cmd) {
        case "/help": {
          await tgSendMessage(chatId, helpText);
          return res.sendStatus(200);
        }
        case "/config": {
          const c = getChatState(chatId);
          await tgSendMessage(
            chatId,
            [
              "⚙️ *Configurazione attuale*",
              `• Mode  → ${c.mode}`,
              `• Voice → ${c.voice}`,
              `• Lang  → ${c.lang}`,
              `• Model → ${c.model}`,
            ].join("\n")
          );
          return res.sendStatus(200);
        }
        case "/mode": {
          if (!arg) {
            await tgSendMessage(chatId, `🧭 Modalità corrente: ${cfg.mode}\n_USA:_ /mode free | /mode books | /mode hy`);
            return res.sendStatus(200);
          }
          const allowed = ["free", "books", "hy"];
          if (!allowed.includes(arg)) {
            await tgSendMessage(chatId, "⚠️ Valori validi: free | books | hy");
            return res.sendStatus(200);
          }
          setChatState(chatId, { mode: arg });
          await tgSendMessage(chatId, `🧭 Modalità impostata su: *${arg.toUpperCase()}*`);
          return res.sendStatus(200);
        }
        case "/lang": {
          if (!arg) {
            await tgSendMessage(chatId, `🌍 Lingua corrente: ${cfg.lang}\n_USA:_ /lang it | /lang en | /lang ru`);
            return res.sendStatus(200);
          }
          const allowed = ["it", "en", "ru"];
          if (!allowed.includes(arg)) {
            await tgSendMessage(chatId, "⚠️ Valori validi: it | en | ru");
            return res.sendStatus(200);
          }
          setChatState(chatId, { lang: arg });
          await tgSendMessage(chatId, `🌍 Lingua impostata su: *${arg.toUpperCase()}*`);
          return res.sendStatus(200);
        }
        case "/model": {
          if (!arg) {
            await tgSendMessage(chatId, `🧠 Modello corrente: ${cfg.model}\n_USA:_ /model gpt-4o-mini | /model gpt-4o`);
            return res.sendStatus(200);
          }
          const allowed = ["gpt-4o-mini", "gpt-4o"];
          if (!allowed.includes(arg)) {
            await tgSendMessage(chatId, "⚠️ Valori validi: gpt-4o-mini | gpt-4o");
            return res.sendStatus(200);
          }
          setChatState(chatId, { model: arg });
          await tgSendMessage(chatId, `🧠 Modello impostato su: *${arg}*`);
          return res.sendStatus(200);
        }
        case "/voice": {
          if (!arg) {
            await tgSendMessage(
              chatId,
              `🔊 Voce corrente: ${cfg.voice}\n_USA:_ /voice openai:alloy | openai:verse | google:it-std | bark:default\n*Nota*: al momento TTS attivo con OpenAI; gli altri provider verranno attivati a breve.`
            );
            return res.sendStatus(200);
          }
          const allowed = ["openai:alloy", "openai:verse", "google:it-std", "bark:default"];
          if (!allowed.includes(arg)) {
            await tgSendMessage(chatId, "⚠️ Valori validi: openai:alloy | openai:verse | google:it-std | bark:default");
            return res.sendStatus(200);
          }
          setChatState(chatId, { voice: arg });
          await tgSendMessage(chatId, `🔊 Voce impostata su: *${arg}*\n_(provider non-openai in preparazione)_`);
          return res.sendStatus(200);
        }
        case "/memory": {
          // Placeholder – integrazione Qdrant in 3.8
          await tgSendMessage(chatId, "🧠 Memoria vettoriale: *standby* (modulo previsto in 3.8).");
          return res.sendStatus(200);
        }
        case "/clear": {
          setChatState(chatId, { confirm: "clear" });
          await tgSendMessage(chatId, "⚠️ Confermi reset configurazione? Rispondi *Y* per confermare o *N* per annullare.");
          return res.sendStatus(200);
        }
        default: {
          await tgSendMessage(chatId, "🌐 IRIS è attiva. Usa /help per i comandi disponibili.");
          return res.sendStatus(200);
        }
      }
    }

    // ===== Messaggi normali → GPT + Voce OGG =====
    const reply = await runGPT(text, cfg);
    await respondWithTTS(chatId, reply, cfg);
  } catch (err) {
    console.error("❌ Errore webhook:", err);
  }
  res.sendStatus(200);
});

// ping
app.get("/", (_req, res) => res.status(200).send("IRIS 3.7.0 OK"));

// avvio
app.listen(PORT, () => {
  console.log(`🌍 Server attivo su porta ${PORT}`);
  console.log("🧭 Modalità: WEBHOOK");
  console.log("💠 IRIS – La mente calcola, la voce vibra, la Coscienza ricorda.");
  console.log(`🔗 Webhook atteso su: /bot${BOT_TOKEN}`);
});
