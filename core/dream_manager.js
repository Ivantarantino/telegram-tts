// core/dream_manager.js – Dream Romana – Giulia & Lidia
import { openai } from "../openai.js";
import fs from "fs";

let currentLang = "rm";
let currentStyle = "comico";

const TTS_TIMEOUT_MS = 45_000;

export function setLang(lang) {
  if (["it", "en", "ru", "rm"].includes(lang)) {
    currentLang = lang;
  }
}

export function setStyle(style) {
  if (["serio", "comico"].includes(style)) {
    currentStyle = style;
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`TTS timeout after ${ms}ms`)), ms);
    })
  ]);
}

async function createSpeechBufferWithRetry({ speaker, voice, text, lineIndex }) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const speech = await withTimeout(
        openai.audio.speech.create({
          model: "tts-1",
          voice,
          input: text
        }),
        TTS_TIMEOUT_MS
      );

      return Buffer.from(await speech.arrayBuffer());
    } catch (e) {
      console.error("[DREAM] tts attempt failed", {
        lineIndex,
        speaker,
        attempt,
        error: e.message
      });
    }
  }

  console.error("[DREAM] tts skipped after retries", {
    lineIndex,
    speaker
  });
  return null;
}

function buildPromptAndCaption(testo) {
  if (currentLang === "rm" && currentStyle === "comico") {
    return {
      prompt: `Siete GIULIA e LIDIA, due trasteverine DOC ubriache de verità.
Parlate SOLO in romanesco puro: "aó", "ma va'", "er core", "che te serve", "nun me fa' incazzà", "bella lì", "Roma mia".
Spiegate il testo come se foste al bar de Piazza San Cosimato, emozionate, interrompetevi, ridete, fate battute.

Testo:
${testo}

Rispondi SOLO con:
GIULIA: [testo]
LIDIA: [testo]
GIULIA: [testo]
ecc.`,
      caption: "AÓ! Giulia & Lidia te l’hanno spiegato come se stessimo a San Cosimato! ❤️\nRoma mia, nun te vonno portà via!"
    };
  }

  if (currentLang === "en") {
    return {
      prompt: `You are Giulia and Lidia, two Italian women speaking perfect English.
Explain the text in a ${currentStyle === "serio" ? "clear, educational" : "warm, engaging"} way.

Text:
${testo}

Answer ONLY with:
GIULIA: [text]
LIDIA: [text]
GIULIA: [text]
etc.`,
      caption: "Giulia & Lidia explained it with all their heart. ❤️"
    };
  }

  if (currentLang === "ru") {
    return {
      prompt: `Вы — Джулия и Лидия, две итальянки, говорящие по-русски.
Объясните текст ${currentStyle === "serio" ? "чётко и глубоко" : "тепло и живо"}.

Текст:
${testo}

Отвечайте ТОЛЬКО так:
ДЖУЛИЯ: [текст]
ЛИДИЯ: [текст]
ДЖУЛИЯ: [текст]
и т.д.`,
      caption: "Джулия и Лидия объяснили от всего сердца. ❤️"
    };
  }

  return {
    prompt: `Siete Giulia e Lidia, due donne italiane.
Spiegate il testo in italiano ${currentStyle === "serio" ? "chiaro e profondo" : "caloroso e amichevole"}.

Testo:
${testo}

Rispondi SOLO con:
GIULIA: [testo]
LIDIA: [testo]
GIULIA: [testo]
ecc.`,
    caption: "Giulia & Lidia te l’hanno spiegato con tutto er core. ❤️"
  };
}

function parseSpeakerLine(line) {
  const text = line.trim();

  if (text.match(/^(GIULIA|ДЖУЛИЯ)[:：]/i)) {
    return {
      speaker: "Giulia",
      voice: "shimmer",
      text: text.replace(/^(GIULIA|ДЖУЛИЯ)[:：]/i, "").trim()
    };
  }

  if (text.match(/^(LIDIA|ЛИДИЯ)[:：]/i)) {
    return {
      speaker: "Lidia",
      voice: "echo",
      text: text.replace(/^(LIDIA|ЛИДИЯ)[:：]/i, "").trim()
    };
  }

  return null;
}

export async function handleDreamCommand(bot, msg, chatId) {
  await bot.sendChatAction(chatId, "typing");

  const testo = msg.text.replace(/^\/(dream|sogni)(@\w+)?\s*/i, "").trim();

  if (!testo || testo.length < 20) {
    await bot.sendMessage(chatId, "Aó, mandame n’po’ de testo da spiegà, mica du’ parole! ❤️\nScrivi: /dream [il tuo testo]");
    return;
  }

  try {
    const { prompt, caption } = buildPromptAndCaption(testo);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: currentStyle === "comico" ? 0.98 : 0.8,
      max_tokens: 3000
    });

    const dialogo = completion.choices[0].message.content;
    const lines = dialogo.split("\n").filter(l => l.trim());
    const audioBuffers = [];

    for (let i = 0; i < lines.length; i++) {
      const parsed = parseSpeakerLine(lines[i]);

      if (!parsed || !parsed.text) {
        continue;
      }

      const buffer = await createSpeechBufferWithRetry({
        speaker: parsed.speaker,
        voice: parsed.voice,
        text: parsed.text,
        lineIndex: i
      });

      if (!buffer) {
        continue;
      }

      audioBuffers.push(buffer);
    }

    if (audioBuffers.length === 0) {
      await bot.sendMessage(chatId, "Aó, nun s’è capito chi parlava… riprova! ❤️");
      return;
    }

    const fullAudio = Buffer.concat(audioBuffers);
    fs.writeFileSync("dream.ogg", fullAudio);

    await bot.sendVoice(chatId, fs.createReadStream("dream.ogg"), {
      caption
    });
  } catch (e) {
    console.error("Errore dream:", e.message);
    console.error("Stack dream:", e.stack);
    await bot.sendMessage(chatId, "Aó, s’è incastrato tutto… riprova che mo’ aggiustamo! ❤️");
  }
}
