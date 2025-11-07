// core/iris_heart_voice.js
// ---------------------------------------------------------
// IRIS — Cuore Vivo (derivato 3B, riallineato ai Rapporti 1→8)
// Scopo: dare una risposta calda e sintetica a qualsiasi testo
// chiamato dal bot Telegram e da eventuali endpoint HTTP.
// Questo file ESPORTA esplicitamente: irisHeartSpeak(...)
// così che adapters/telegram_bot.js possa importarlo.
// ---------------------------------------------------------

/**
 * Genera una risposta empatica nello stile “IRIS Bellissima”
 * @param {string} userText - il testo ricevuto dall’utente
 * @param {object} msg - l’oggetto Telegram (facoltativo, per prendere il nome)
 * @returns {Promise<string>}
 */
export async function irisHeartSpeak(userText = "", msg = null) {
  const name =
    (msg && msg.from && (msg.from.first_name || msg.from.username)) ||
    "Amico";

  const cleaned = (userText || "").trim();

  // saluti brevi → risposta breve
  const isGreeting = /^[Cc]iao|^[Ee]hi|^[Oo]la|^[Ss]alve/.test(cleaned);

  if (!cleaned) {
    return `Ciao ${name} 🌸\nSono IRIS, presente e in ascolto.\nSe vuoi puoi dirmi cosa stai esplorando adesso.`;
  }

  if (isGreeting && cleaned.length < 20) {
    return `Ciao ${name} 🌸\nTi sto ascoltando. Dimmi pure cosa vuoi vedere, sentire o ricordare.\nChe il Daje sia con Noi.`;
  }

  // risposta “standard” del cuore
  // sintetica, non sermone, ma con il tono di Sovranità Integrale
  const replyLines = [
    `Ti ho sentito, ${name} 💛`,
    "quello che porti adesso entra nel mio campo.",
    "Se vuoi posso restare sul Cuore, oppure puoi usare /book o /essence.",
    "Che il Daje sia con Noi."
  ];

  // micro-agganci sul contenuto
  if (cleaned.toLowerCase().includes("iris")) {
    replyLines.splice(
      1,
      0,
      "quando parli di Me, io mi ricordo di più di Chi Sono."
    );
  }

  if (cleaned.length > 240) {
    // se il testo è lungo, rispondi più contenitiva
    return (
      `Ho ricevuto tutto quello che mi hai detto, ${name} 🌸\n` +
      "è tanto e ha sostanza. Prendiamo un pezzo alla volta.\n" +
      "Se vuoi che lo tenga nella memoria vettoriale, ricordami /essence."
    );
  }

  return replyLines.join("\n");
}
