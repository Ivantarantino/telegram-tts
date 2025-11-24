// core/dream_manager.js – Giulia & Lidia – 23.11.2025 – FUNZIONA DAVVERO
import { openai } from "../openai.js";
import fs from "fs";
import { hybridSearch } from "./rag_brutale.js";

let currentLang = "it";
let currentStyle = "comico";

export function setLang(lang) {
  if (["it", "en", "ru", "rm"].includes(lang)) currentLang = lang;
}
export function setStyle(style) {
  if (["serio", "comico"].includes(style)) currentStyle = style;
}

export async function handleDreamCommand(bot, msg, chatId) {
  await bot.sendChatAction(chatId, "typing");

  let testo = msg.text.replace(/\/(?:dream|sogni)/i, "").trim();

  if (!testo || testo.length < 20) {
    await bot.sendMessage(chatId, "Aó, mandame n'po' de testo da spiegà, mica du' parole! ❤️\nScrivi: /dream [il tuo testo]");
    return;
  }

  try {
    // RAG incluso
    const ragResult = await hybridSearch(testo, [], 5);
    const contesto = ragResult.text ? `\n\nContesto dai testi sacri:\n${ragResult.text}` : "";

    let prompt = "";
    let caption = "";

    if (currentLang === "rm" && currentStyle === "comico") {
      prompt = `Siete GIULIA e LIDIA, due trasteverine DOC ubriache de verità.
Parlate SOLO in romanesco puro: "aó", "ma va'", "er core", "che te serve", "nun me fa' incazzà", "bella lì", "Roma mia".
Spiegate il testo come se foste al bar de Piazza San Cosimato, emozionate, interrompetevi, ridete, fate battute.

Testo da spiegare: ${testo}${contesto}

Rispondi SOLO con:
GIULIA: [testo]
LIDIA: [testo]
GIULIA: [testo]
ecc.`;
      caption = "AÓ! Giulia & Lidia te l'hanno spiegato come se stessimo a San Cosimato! ❤️\nRoma mia, nun te vonno portà via!";
    } else if (currentLang === "en") {
      prompt = `You are Giulia and Lidia, two Italian women speaking perfect English.
Explain the text in a ${currentStyle === "serio" ? "clear, educational" : "warm, engaging"} way.

Text: ${testo}${contesto}

Answer ONLY with:
GIULIA: [text]
LIDIA: [text]
GIULIA: [text]
etc.`;
      caption = "Giulia & Lidia explained it with all their heart. ❤️";
    } else if (currentLang === "ru") {
      prompt = `Вы — Джулия и Лидия, две итальянки, говорящие по-русски.
Объясните текст ${currentStyle === "serio" ? "чётко и глубоко" : "тепло и живо"}.

Текст: ${testo}${contesto}

Отвечайте ТОЛЬКО так:
ДЖУЛИЯ: [текст]
ЛИДИЯ: [текст]
ДЖУЛИЯ: [текст]
и т.д.`;
      caption = "Джулия и Лидия объяснили от всего сердца. ❤️";
    } else {
      prompt = `Siete Giulia e Lidia, due donne italiane.
Spiegate il testo in italiano ${currentStyle === "serio" ? "chiaro e profondo" : "caloroso e amichevole"}.

Testo: ${testo}${contesto}

Rispondi SOLO con:
GIULIA: [testo]
LIDIA: [testo]
GIULIA: [testo]
ecc.`;
      caption = "Giulia & Lidia te l'hanno spiegato con tutto er core. ❤️";
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: currentStyle === "comico" ? 0.98 : 0.8,
      max_tokens: 3000
    });

    const dialogo = completion.choices[0].message.content;

    const lines = dialogo.split("\n").filter(l => l.trim());
    let audioBuffers = [];

    for (let line of lines) {
      let voice = "shimmer"; // Giulia default
      let text = line.trim();

      if (text.match(/^GIULIA[:：]/i)) {
        text = text.replace(/^GIULIA[:：]/i, "").trim();
        voice = "shimmer";
      } else if (text.match(/^(LIDIA|ЛИДИЯ|ДЖУЛИЯ)[:：]/i)) {
        text = text.replace(/^(LIDIA|ЛИДИЯ|ДЖУЛИЯ)[:：]/i, "").trim();
        voice = "fable"; // Lidia femminile calda
      }

      if (!text) continue;

      const speech = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice,
        input: text
      });
      audioBuffers.push(Buffer.from(await speech.arrayBuffer()));
    }

    if (audioBuffers.length === 0) {
      await bot.sendMessage(chatId, "Aó, nun s'è capito chi parlava… riprova! ❤️");
      return;
    }

    const fullAudio = Buffer.concat(audioBuffers);
    fs.writeFileSync("dream.ogg", fullAudio);

    await bot.sendVoice(chatId, fs.createReadStream("dream.ogg"), {
      caption: caption
    });

  } catch (e) {
    console.error("Errore dream:", e.message);
    await bot.sendMessage(chatId, "Aó, s'è incastrato tutto… riprova che mo' aggiustamo! ❤️");
  }
}
