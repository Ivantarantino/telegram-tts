// index.js — IRIS Telegram Bot (robusto: chunking + escape + fallback)

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

// ====== CONFIG ======
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const IS_RENDER = !!process.env.RENDER; // o qualunque flag usi in deploy
const PORT = process.env.PORT ? Number(process.env.PORT) : 10000;

if (!TELEGRAM_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN mancante nel .env");
  process.exit(1);
}

// ====== BOT INSTANCE ======
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Se c’era un webhook attivo da un’altra istanza, lo disattiviamo
bot.deleteWebHook({ drop_pending_updates: false }).catch(() => {});

// ====== LOG AVVIO ======
console.log(IS_RENDER ? "🌐 Ambiente: Render" : "💻 Ambiente locale");
console.log(`🌍 Server attivo su porta ${PORT}`);

// Dummy HTTP server (utile su Render/Heroku per tenere viva l’istanza)
require("http")
  .createServer((_, res) => res.end("IRIS OK"))
  .listen(PORT);

// ====== UTILS: MarkdownV2 escape & chunking ======
const MDV2_SPECIALS = /[_*[\]()~`>#+\-=|{}.!\\]/g; // specifico MarkdownV2
function escapeMarkdownV2(text = "") {
  return String(text).replace(MDV2_SPECIALS, (m) => "\\" + m);
}

function* chunk(text, max = 3500) {
  let i = 0;
  while (i < text.length) {
    yield text.slice(i, i + max);
    i += max;
  }
}

/**
 * Invia in modo "sicuro":
 * 1) prova MarkdownV2 con escape e chunking
 * 2) se Telegram rifiuta, riprova come testo semplice
 */
async function safeSend(chatId, text, extra = {}) {
  if (text == null) text = "";
  const raw = String(text);

  for (const part of chunk(raw, 3500)) {
    // 1) tenta con MarkdownV2
    try {
      const escaped = escapeMarkdownV2(part);
      await bot.sendMessage(chatId, escaped, {
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
        ...extra,
      });
      continue; // passa al prossimo chunk
    } catch (err) {
      console.error("⚠️ Errore invio (MarkdownV2):", err?.response?.body || err.message);
      // 2) fallback: testo semplice
      try {
        await bot.sendMessage(chatId, part, {
          disable_web_page_preview: true,
          ...extra,
        });
      } catch (err2) {
        console.error("❌ Fallito anche senza Markdown:", err2?.response?.body || err2.message);
      }
    }
  }
}

// ====== HANDLERS DI SERVIZIO ======
bot.on("polling_error", (err) => {
  // Caso classico: 409 Conflict se hai un’altra istanza attiva
  if (String(err?.message || "").includes("409")) {
    console.error("⚠️ 409 Conflict: un’altra istanza sta facendo polling. Chiudi l’altra.");
  } else {
    console.error("⚠️ polling_error:", err?.response?.body || err.message);
  }
});

bot.on("webhook_error", (err) => {
  console.error("⚠️ webhook_error:", err?.response?.body || err.message);
});

// ====== LOGICA RISPOSTE ======
// Se hai già una tua pipeline (RAG/tts ecc.), mettila qui dentro
async function generateReply(msg) {
  const text = (msg.text || "").trim();

  // Risposte base per testare che l’invio funzioni sempre
  if (!text) return "Dimmi pure 🙂";
  if (/^ciao\b/i.test(text)) return "Ciao! 👋 Come posso aiutarti?";
  if (/^help\b/i.test(text)) {
    return [
      "*Comandi utili*",
      "- Scrivi una domanda qualsiasi",
      "- Invia un PDF o un testo lungo: IRIS lo gestisce a chunk",
      "",
      "_Se qualcosa non va, riprova: l’invio ora è robusto._",
    ].join("\n");
  }

  // 👉 Qui puoi integrare la tua logica esistente (es. RAG):
  // const answer = await myRagAnswer(text);
  // return answer;

  // Default
  return "Ho ricevuto il tuo messaggio. Dimmi pure su cosa vuoi lavorare. 🙂";
}

// ====== EVENTI MESSAGGI ======
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  try {
    const reply = await generateReply(msg);
    await safeSend(chatId, reply);
  } catch (err) {
    console.error("❌ Errore in generateReply:", err);
    await safeSend(chatId, "Si è verificato un errore inatteso. Riprova tra poco.");
  }
});

// ====== CHIUSURA GRACEFUL ======
process.on("SIGINT", async () => {
  console.log("👋 Chiusura in corso…");
  try { await bot.stopPolling(); } catch {}
  process.exit(0);
});
