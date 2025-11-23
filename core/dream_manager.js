// core/dream_manager.js – Giulia & Lidia – 23.11.2025 – FUNZIONA DAVVERO
import { openai } from "../openai.js";
import fs from "fs";

let currentLang = "it";
let currentStyle = "comico";
let currentVoice = "nova";

export function setLang(lang) { currentLang = lang; }
export function setStyle(style) { currentStyle = style; }
export function setVoice(voice) { currentVoice = voice; }

export async function handleDreamCommand(bot, msg, chatId) {
  await bot.sendChatAction(chatId, "typing");

  const testo = msg.text.replace(/\/(?:dream|sogni)/i, "").trim();

  if (!testo || testo.length < 20) {
    await bot.sendMessage(chatId, "Aó, mandame n’po’ de testo, mica du’ spicci! ❤️");
    return;
  }

  try {
    let prompt = "";
    let caption = "";

    if (currentLang === "rm" && currentStyle === "comico") {
      prompt = `Siete GIULIA e LIDIA, due trasteverine DOC.
Parlate SOLO in romanesco puro: "aó", "ma va'", "er core", "che te serve", "nun me fa' incazzà", "bella zzì".
Spiegate il testo come se foste al bar de Piazza San Cosimato.
Fate battute, interrompetevi, ridete.

Testo da spiegare:
${testo}

Rispondi SOLO con:
GIULIA: [testo]
LIDIA: [testo]
GIULIA: [testo]
ecc.`;
      caption = "AÓ! Giulia & Lidia te l’hanno spiegato come se stessimo a San Cosimato! ❤️\nRoma mia, nun te vonno portà via!";
    } else {
      prompt = `Siete Giulia e Lidia, due donne italiane.
Spiegate il testo in italiano ${currentStyle === "serio" ? "chiaro e profondo" : "caloroso e amichevole"}.

Testo: ${testo}

Rispondi SOLO con:
GIULIA: [testo]
LIDIA: [testo]
GIULIA: [testo]
ecc.`;
      caption = "Giulia & Lidia te l’hanno spiegato con tutto er core. ❤️";
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
      let voice = currentVoice;
      let text = line.trim();

      if (text.toUpperCase().startsWith("GIULIA:")) {
        text = text.replace(/^GIULIA:/i, "").trim();
        voice = "shimmer";
      } else if (text.toUpperCase().startsWith("LIDIA:")) {
        text = text.replace(/^LIDIA:/i, "").trim();
        voice = "echo";
      }

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
    await bot.sendMessage(chatId, "Aó, s’è impallato tutto… riprova che mmo’ aggiustamo! ❤️");
  }
}
