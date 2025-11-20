// core/sogni.js – Podcast trasteverino puro – Marco & Giulia – 20.11.2025
import { openai } from "../openai.js";
import fs from "fs";

const VOCE_MARCO = "nova";     // rauca, romana, un po’ incazzata ma bonacciona
const VOCE_GIULIA = "shimmer";  // dolce ma co’ carattere, trasteverina verace

export async function handleSogniCommand(bot, msg, chatId) {
  await bot.sendChatAction(chatId, "typing");

  const testo = msg.text.replace("/sogni", "").trim();

  if (!testo || testo.length < 20) {
    await bot.sendMessage(chatId, "Aó, ma che me combini? Mandame n’po’ de testo, mica du’ parole! ❤️");
    return;
  }

  try {
    const prompt = `
    Siete Marco e Giulia, due amici trasteverini DOC che stanno a commentà sto testo.
    Parlate solo in romano puro, con "aó", "ma va'", "er core", "che te serve", "nun me fa' incazzà", "bella lì".
    Spiegate il testo come se foste al bar de Piazza San Cosimato, emozionati, fatevi domande, interrompetevi, ridete, dite "MA CHE È 'STA ROBA?" quando serve.
    Durata chiacchiera: 4-6 minuti.

    Testo:

    ${testo}

    Rispondi SOLO col dialogo alternato:
    Marco:
    Giulia:
    Marco:
    ecc.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.98,
      max_tokens: 3000
    });

    const dialogo = completion.choices[0].message.content;

    const lines = dialogo.split("\n").filter(l => l.trim());
    let audioBuffers = [];

    for (let line of lines) {
      if (line.toLowerCase().includes("marco:")) {
        const text = line.replace(/marco:/i, "").trim();
        const speech = await openai.audio.speech.create({
          model: "tts-1",
          voice: VOCE_MARCO,
          input: text
        });
        audioBuffers.push(Buffer.from(await speech.arrayBuffer()));
      }
      if (line.toLowerCase().includes("giulia:")) {
        const text = line.replace(/giulia:/i, "").trim();
        const speech = await openai.audio.speech.create({
          model: "tts-1",
          voice: VOCE_GIULIA,
          input: text
        });
        audioBuffers.push(Buffer.from(await speech.arrayBuffer()));
      }
    }

    const fullAudio = Buffer.concat(audioBuffers);
    fs.writeFileSync("sogno.ogg", fullAudio);

    await bot.sendVoice(chatId, fs.createReadStream("sogno.ogg"), {
      caption: "AÓ, eccolo er podcast! Marco e Giulia te l’hanno spiegato come se stessimo a San Cosimato. ❤️\nRoma mia, nun te vonno portà via!"
    });

  } catch (e) {
    console.error("Errore sogni:", e.message);
    await bot.sendMessage(chatId, "Aó, s’è incastrato tutto… riprova che mo’ aggiustamo, fratè! ❤️");
  }
}
