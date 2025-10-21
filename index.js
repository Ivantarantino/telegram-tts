// 🧼 Normalizza un comando Telegram tipo "/mode@MyBot" -> "/mode"
function normalizeCommand(text) {
  if (!text || typeof text !== "string") return null;
  const raw = text.trim();

  // prendi solo la prima "parola"
  let base = raw.split(/\s+/)[0];

  // normalizza minuscolo
  base = base.toLowerCase();

  // rimuovi eventuale suffisso @nomebot
  base = base.replace(/@[\w_]+$/, "");

  // rimuovi eventuali \r, \n, caratteri invisibili
  base = base.replace(/[\u200B-\u200D\uFEFF\r\n]+/g, "");

  // opzionale: se qualcuno invia //mode o simili
  base = base.replace(/^\/+/, "/");

  return base;
}

// === webhook diretto ===
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  try {
    // ... tuoi log di raw body e parsed body ...

    const msg = req.body.message || req.body?.edited_message;
    const chatId = msg?.chat?.id;
    const text = msg?.text;
    if (!text) return res.sendStatus(200);

    console.log(`📩 Messaggio da ${msg.from.first_name}: [${text}]`);

    // 🎯 intercettazione comandi
    if (text.startsWith("/")) {
      const base = normalizeCommand(text);
      console.log(`🔍 Comando ricevuto (normalizzato): ${base}`);

      // Dizionario comandi (assicurati le chiavi siano **minuscole** e senza @bot)
      const reply = commands[base];

      if (reply) {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: reply }),
        });
        console.log(`⚡ Comando gestito: ${base}`);
        return res.sendStatus(200); // 🔒 blocca il flusso: niente GPT, niente TTS
      }

      // Se è un comando sconosciuto, rispondi testuale e **blocca comunque**
      const fallback = `⚠️ Comando non riconosciuto: ${base}\nProva /mode, /voice, /lang, /model o /config.`;
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: fallback }),
      });
      console.log(`⚠️ Comando non riconosciuto: ${base}`);
      return res.sendStatus(200);
    }

    // ✨ normale messaggio → GPT + TTS (come già fai)
    // ...
  } catch (err) {
    console.error("❌ Errore generale:", err);
  }
  res.sendStatus(200);
});
