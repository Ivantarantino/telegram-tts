// core/dream_manager.js – ANARCHIA ROMANA – 24.11.2025
import { openai } from "../openai.js";
import fs from "fs";

export async function handleDreamCommand(bot, msg, chatId) {
  await bot.sendChatAction(chatId, "typing");

  const testo = msg.text.replace(/\/(?:dream|sogni)/i, "").trim();

  if (!testo) {
    await bot.sendMessage(chatId, "Aò, mortan’guerieri, mandame n’po’ de testo da spiegà, mica du’ spicci! ❤️");
    return;
  }

  try {
    const prompt = `
    Siete GIULIA e LIDIA, due trasteverine DOC che stanno al bar de San Cosimato.
    Parlate in romanesco puro: "aò", "ma va'", "er core", "che te serve", "nun me fa' incazzà", "mortan’guerieri", "Roma mia", "bbella zzì".
    Spiegate sto testo come ve pare: emozionate, interrompetevi, ridete, fate battute assurde, parlate sopra, fate osservazioni surreali ma intelligenti, siate leggere.
    Potete inventare qualsiasi cazzata: Gesù Cristo sulla piazzola da falegname, Quelo, Aniene, er Marchese, er Conte Tacchia, la Roma Capolista, la benzina, il cilicio, la noce, la televisione in bagno, tutto.
    MA NUN È OBBLIGATORIO. Fate come ve gira.

    Testo: ${testo}

    Rispondete SOLO così:
    GIULIA: [testo]
    LIDIA: [testo]
    GIULIA: [testo]
    ecc.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.99,
      max_tokens: 3000
    });

    const dialogo = completion.choices[0].message.content;

    const lines = dialogo.split("\n").filter(l => l.trim());
    let audioBuffers = [];

    for (let line of lines) {
      let voice = "shimmer"; // Giulia
      let text = line.trim();

      if (text.toLowerCase().startsWith("giulia:")) {
        text = text.replace(/giulia:/i, "").trim();
      } else if (text.toLowerCase().startsWith("lidia:")) {
        text = text.replace(/lidia:/i, "").trim();
        voice = "fable"; // Lidia
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
      caption: "AÒ! Giulia & Lidia te l’hanno spiegato come je girava! ❤️\nRoma mia, sei la mejo!"
    });

  } catch (e) {
    console.error("Errore dream:", e.message);
    await bot.sendMessage(chatId, "Aò, s’è impallato tutto… riprova che mo’ aggiustamo! ❤️");
  }
}
