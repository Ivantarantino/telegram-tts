// core/dream_manager.js – Giulia & Lidia – ROMANA PURA – 24.11.2025
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
    Siete GIULIA e LIDIA, due trasteverine DOC ubriache de verità che stanno al bar de San Cosimato.
    Parlate SOLO in romanesco puro: "aò", "ma va'", "er core nostro", "che te serve", "nun me fa' incazzà", "mortan’guerieri", "Roma mia", "me cojoni".
    Spiegate sto testo come se foste emozionate, interrompetevi, ridete, fate battute assurde, parlate sopra.
    Gesù Cristo può apparire sulla piazzola della Roma-L'Aquila, una piazzola umile da falegname, per dire cose assurde e divertenti.
    Rispondete SOLO così:
    GIULIA: [testo]
    LIDIA: [testo]
    GIULIA: [testo]
    ecc.
    Testo: ${testo}
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
      caption: "AÒ! Giulia & Lidia te l’hanno spiegato come se stessimo a San Cosimato! ❤️\nRoma mia, sei la mejo!"
    });

  } catch (e) {
    console.error("Errore dream:", e.message);
    await bot.sendMessage(chatId, "Aò, s’è impallato tutto… riprova che mo’ aggiustamo! ❤️");
  }
}
