// core/sogni.js – Podcast trasteverino puro – Lidia & Giulia – 20.11.2025
import { openai } from "../openai.js";
import fs from "fs";

const VOCE_LIDIA = "nova";     // rauca, romana, un po’ incazzata ma bonacciona
const VOCE_GIULIA = "shimmer";  // dolce ma co’ carattere, trasteverina verace

export async function handleSogniCommand(bot, msg, chatId) {
  await bot.sendChatAction(chatId, "typing");

  const testo = msg.text.replace(/^\/(sogni|dream)(@\w+)?\s*/i, "").trim();
  console.log("[SOGNI] start", {
    chatId,
    msgTextLength: msg.text?.length || 0,
    testoLength: testo.length
  });

  if (!testo || testo.length < 20) {
    await bot.sendMessage(chatId, "Aó, ma che me combini? Mandame n’po’ de testo, mica du’ parole! ❤️");
    return;
  }

  try {
    const prompt = `
    Siete Lidia e Giulia, due amici trasteverini DOC che stanno a commentà sto testo.
    Parlate solo in romano puro, con "aó", "ma va'", "er core", "che te serve", "nun me fa' incazzà", "bella lì".
    Spiegate il testo come se foste al bar de Piazza San Cosimato, emozionati, fatevi domande, interrompetevi, ridete, dite "MA CHE È 'STA ROBA?" quando serve.
    Durata chiacchiera: 4-6 minuti.

    Testo:

    ${testo}

    Rispondi SOLO col dialogo alternato:
    Lidia:
    Giulia:
    Lidia:
    ecc.
    `;

    console.log("[SOGNI] chat completion start");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.98,
      max_tokens: 3000
    });

    const dialogo = completion.choices[0].message.content;
    console.log("[SOGNI] chat completion done", {
      dialogoLength: dialogo?.length || 0
    });

    const lines = dialogo.split("\n").filter(l => l.trim());
    console.log("[SOGNI] lines parsed", {
      linesLength: lines.length,
      lidiaLines: lines.filter(line => line.toLowerCase().includes("lidia:")).length,
      giuliaLines: lines.filter(line => line.toLowerCase().includes("giulia:")).length
    });
    let audioBuffers = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes("lidia:")) {
        const text = line.replace(/lidia:/i, "").trim();
        console.log("[SOGNI] tts start", {
          lineIndex: i,
          speaker: "Lidia",
          textLength: text.length
        });
        const speech = await openai.audio.speech.create({
          model: "tts-1",
          voice: VOCE_LIDIA,
          input: text
        });
        const buffer = Buffer.from(await speech.arrayBuffer());
        audioBuffers.push(buffer);
        console.log("[SOGNI] tts done", {
          lineIndex: i,
          bufferLength: buffer.length
        });
      }
      if (line.toLowerCase().includes("giulia:")) {
        const text = line.replace(/giulia:/i, "").trim();
        console.log("[SOGNI] tts start", {
          lineIndex: i,
          speaker: "Giulia",
          textLength: text.length
        });
        const speech = await openai.audio.speech.create({
          model: "tts-1",
          voice: VOCE_GIULIA,
          input: text
        });
        const buffer = Buffer.from(await speech.arrayBuffer());
        audioBuffers.push(buffer);
        console.log("[SOGNI] tts done", {
          lineIndex: i,
          bufferLength: buffer.length
        });
      }
    }

    console.log("[SOGNI] tts loop done", {
      audioBuffersLength: audioBuffers.length
    });
    const fullAudio = Buffer.concat(audioBuffers);
    console.log("[SOGNI] audio concat done", {
      fullAudioLength: fullAudio.length
    });
    console.log("[SOGNI] writing audio file");
    fs.writeFileSync("sogno.ogg", fullAudio);
    console.log("[SOGNI] audio file written");

    console.log("[SOGNI] sendVoice start");
    await bot.sendVoice(chatId, fs.createReadStream("sogno.ogg"), {
      caption: "AÓ, eccolo er podcast! Lidia e Giulia te l’hanno spiegato come se stessimo a San Cosimato. ❤️\nRoma mia, nun te vonno portà via!"
    });
    console.log("[SOGNI] sendVoice done");

  } catch (e) {
    console.error("[SOGNI] error message:", e.message);
    console.error("[SOGNI] error stack:", e.stack);
    await bot.sendMessage(chatId, "Aó, s’è incastrato tutto… riprova che mo’ aggiustamo, fratè! ❤️");
  }
}
