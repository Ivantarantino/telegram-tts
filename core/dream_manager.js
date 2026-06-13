// core/dream_manager.js – Dream Romana – Giulia & Lidia
import { openai } from "../openai.js";
import fs from "fs";
import { getDreamRagContext } from "./dream_rag_context.js";

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

function buildPromptAndCaption(testo, dreamRagContext = "") {
  const ragSection = dreamRagContext
    ? `

Contesto breve dalla Biblioteca IRIS, da usare come seme narrativo.
Non citarlo rigidamente. Non trasformare la scena in una lezione.
Usalo per dare profondità, ma resta Giulia/Lidia vive, romanesche, comiche.

---

${dreamRagContext}
---`
    : "";

  if (currentLang === "rm" && currentStyle === "comico") {
    return {
      prompt: `Siete GIULIA e LIDIA, due trasteverine DOC ubriache de verità.
Parlate SOLO in romanesco puro: "aó", "ma va'", "er core", "che te serve", "nun me fa' incazzà", "bella lì", "Roma mia".
Fate una scenetta viva, non una spiegazione breve.
Alternate sempre GIULIA e LIDIA.
Scrivete almeno 12 battute e massimo 14 battute totali.
Ogni battuta deve essere abbastanza corposa, ma non infinita.
Potete usare parolacce leggere romanesche: cazzo, mortacci, annamo bene, porca miseria.
Inventate immagini assurde e comiche, ma mantenete il senso del testo.
Non chiudete subito: costruite una piccola scena.
Interrompetevi, battibeccate, fate battute, ma restate dentro il tema.
Non inserite righe narrative senza speaker.
Ogni riga deve iniziare SOLO con GIULIA: o LIDIA:

Testo:
${testo}
${ragSection}

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
${ragSection}

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
${ragSection}

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
${ragSection}

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
      voice: "nova",
      text: text.replace(/^(LIDIA|ЛИДИЯ)[:：]/i, "").trim()
    };
  }

  return null;
}

export async function handleDreamCommand(bot, msg, chatId) {
  await bot.sendChatAction(chatId, "typing");

  const testo = msg.text.replace(/^\/(dream|sogni)(@\w+)?\s*/i, "").trim();
  console.log("[DREAM] start", {
    chatId,
    msgTextLength: msg.text?.length || 0,
    testoLength: testo.length,
    currentLang,
    currentStyle
  });

  if (!testo || testo.length < 20) {
    await bot.sendMessage(chatId, "Aó, mandame n’po’ de testo da spiegà, mica du’ parole! ❤️\nScrivi: /dream [il tuo testo]");
    return;
  }

  try {
    console.log("[DREAM] rag context start");
    const dreamRagContext = await getDreamRagContext(testo);
    console.log("[DREAM] rag context done", {
      hasContext: dreamRagContext.length > 0,
      contextLength: dreamRagContext.length
    });

    const { prompt, caption } = buildPromptAndCaption(testo, dreamRagContext);

    console.log("[DREAM] chat completion start");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: currentStyle === "comico" ? 0.98 : 0.8,
      max_tokens: 3000
    });

    const dialogo = completion.choices[0].message.content;
    console.log("[DREAM] chat completion done", {
      dialogoLength: dialogo.length
    });

    const lines = dialogo.split("\n").filter(l => l.trim());
    console.log("[DREAM] lines parsed raw", {
      linesLength: lines.length
    });

    const parsedItems = [];
    let parsedLines = 0;
    let skippedLines = 0;
    let giuliaLines = 0;
    let lidiaLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const parsed = parseSpeakerLine(lines[i]);

      if (!parsed || !parsed.text) {
        skippedLines++;
        continue;
      }

      parsedLines++;
      if (parsed.speaker === "Giulia") {
        giuliaLines++;
      }
      if (parsed.speaker === "Lidia") {
        lidiaLines++;
      }

      parsedItems.push({
        lineIndex: i,
        speaker: parsed.speaker,
        voice: parsed.voice,
        text: parsed.text
      });
    }

    const results = new Array(parsedItems.length);
    let nextIndex = 0;
    const concurrency = 2;

    async function worker(workerId) {
      while (nextIndex < parsedItems.length) {
        const itemIndex = nextIndex++;
        const item = parsedItems[itemIndex];

        console.log("[DREAM] tts start", {
          lineIndex: item.lineIndex,
          speaker: item.speaker,
          textLength: item.text.length,
          workerId
        });

        const buffer = await createSpeechBufferWithRetry({
          speaker: item.speaker,
          voice: item.voice,
          text: item.text,
          lineIndex: item.lineIndex
        });

        results[itemIndex] = buffer || null;

        if (buffer) {
          console.log("[DREAM] tts done", {
            lineIndex: item.lineIndex,
            speaker: item.speaker,
            bufferLength: buffer.length,
            workerId
          });
        }
      }
    }

    await Promise.all([worker(1), worker(2)]);

    const audioBuffers = results.filter(Boolean);

    console.log("[DREAM] tts loop done", {
      audioBuffersLength: audioBuffers.length,
      parsedLines,
      skippedLines,
      giuliaLines,
      lidiaLines,
      concurrency
    });

    if (audioBuffers.length === 0) {
      await bot.sendMessage(chatId, "Aó, nun s’è capito chi parlava… riprova! ❤️");
      return;
    }

    const fullAudio = Buffer.concat(audioBuffers);
    console.log("[DREAM] write audio start", {
      audioBuffersLength: audioBuffers.length
    });
    fs.writeFileSync("dream.ogg", fullAudio);
    console.log("[DREAM] write audio done", {
      file: "dream.ogg",
      fullAudioLength: fullAudio.length
    });

    console.log("[DREAM] sendVoice start");
    await bot.sendVoice(chatId, fs.createReadStream("dream.ogg"), {
      caption
    });
    console.log("[DREAM] sendVoice done");
  } catch (e) {
    console.error("Errore dream:", e.message);
    console.error("Stack dream:", e.stack);
    await bot.sendMessage(chatId, "Aó, s’è incastrato tutto… riprova che mo’ aggiustamo! ❤️");
  }
}
