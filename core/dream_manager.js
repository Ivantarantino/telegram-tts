// core/dream_manager.js – Podcast vivente con Giulia & Lidia – 21.11.2025
import { openai } from "../openai.js";
import fs from "fs";

let currentLang = "it";   // default
let currentStyle = "comico"; // default

export function setLang(lang) {
  if (["it", "en", "ru", "rm"].includes(lang)) currentLang = lang;
}

export function setStyle(style) {
  if (["serio", "comico"].includes(style)) currentStyle = style;
}

const VOCI = {
  giulia: "shimmer",  // trasteverina dolce ma co’ carattere
  lidia:  "echo"      // romana verace, un po’ rauca
};

export async function handleDreamCommand(bot, msg, chatId) {
  await bot.sendChatAction(chatId, "typing");

  const testo = msg.text.replace(/\/(?:dream|sogni)/, "").trim();

  if (!testo || testo.length < 20) {
    await bot.sendMessage(chatId, "Aó, mandame n’po’ de testo, mica du’ parole! ❤️");
    return;
  }

  try {
    let systemPrompt = "";
    let caption = "";

    if (currentLang === "rm" && currentStyle === "comico") {
      systemPrompt = `Siete Giulia e Lidia, due trasteverine DOC ubriache de verità.
Parlate solo in romanesco puro: "aó", "ma va'", "er core nostro", "nun me fa' incazzà", "che te serve", "bella lì".
Spiegate il testo come se foste al bar de Piazza San Cosimato, emozionate, interrompetevi, ridete, fate battute.
Testo: ${testo}`;
      caption = "AÓ! Giulia & Lidia te l’hanno spiegato come se stessimo a San Cosimato! ❤️\nRoma mia, nun te vonno portà via!";
    } else if (currentLang === "it") {
      systemPrompt = `Siete Giulia e Lidia, due donne italiane intelligenti e calde.
Parlate in italiano perfetto, tono ${currentStyle === "serio" ? "didattico e profondo" : "caloroso e amichevole"}.
Spiegate il testo con chiarezza e passione.
Testo: ${testo}`;
      caption = "Giulia & Lidia te l’hanno spiegato con tutto er core. ❤️";
    } else if (currentLang === "en") {
      systemPrompt = `You are Giulia and Lidia, two intelligent Italian women speaking perfect English.
Explain the text in a ${currentStyle === "serio" ? "clear, educational" : "warm, engaging"} way.
Text: ${testo}`;
      caption = "Giulia & Lidia explained it with all their heart. ❤️";
    } else if (currentLang === "ru") {
      systemPrompt = `Вы — Джулия и Лидия, две умные итальянки, говорящие по-русски.
Объясните текст ${currentStyle === "serio" ? "чётко и глубоко" : "тепло и живо"}.
Текст: ${testo}`;
      caption = "Джулия и Лидия объяснили от всего сердца. ❤️";
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: currentStyle === "comico" ? 0.98 : 0.85,
      max_tokens: 3000
    });

    const dialogo = completion.choices[0].message.content;

    const lines = dialogo.split("\n").filter(l => l.trim());
    let audioBuffers = [];

    for (let line of lines) {
      let voice = VOCI.giulia;
      if (line.toLowerCase().includes("lidia:")) voice = VOCI.lidia;

      const text = line.replace(/(giulia|lidia):/i, "").trim();
      if (!text) continue;

      const speech = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice,
        input: text
      });
      audioBuffers.push(Buffer.from(await speech.arrayBuffer()));
    }

    const fullAudio = Buffer.concat(audioBuffers);
    fs.writeFileSync("dream.ogg", fullAudio);

    await bot.sendVoice(chatId, fs.createReadStream("dream.ogg"), {
      caption: caption
    });

  } catch (e) {
    console.error("Errore dream:", e.message);
    await bot.sendMessage(chatId, "Aó, s’è incastrato tutto… riprova che mo’ aggiustamo! ❤️");
  }
}
