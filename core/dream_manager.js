// core/dream_manager.js – LA VERSIONE CHE FACEVA RIDERE – 24.11.2025
import { openai } from "../openai.js";
import fs from "fs";

export async function handleDreamCommand(bot, msg, chatId) {
  await bot.sendChatAction(chatId, "typing");

  const testo = msg.text.replace("/dream", "").replace("/sogni", "").trim();

  if (!testo) {
    await bot.sendMessage(chatId, "Aó, mandame n'po' de testo da spiegà, mica du' parole! ❤️");
    return;
  }

  try {
    const prompt = `
    Siete GIULIA e LIDIA, due trasteverine ubriache de verità che stanno al bar de San Cosimato.
    Parlate in romanesco puro: "aó", "ma va'", "er core", "che te serve", "nun me fa' incazzà", "Roma mia".
    Spiegate sto testo come se foste emozionate, interrompetevi, ridete, fate battute.

    Testo: ${testo}

    Rispondete SOLO così:
    GIULIA: [testo]
    LIDIA: [testo]
    GIULIA: [testo]
    ecc.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }], // ← CORRETTO
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
      caption: "AÓ! Giulia & Lidia te l'hanno spiegato come se stessimo a San Cosimato! ❤️\nRoma mia, nun te vonno portà via!"
    });

  } catch (e) {
    console.error("Errore dream:", e.message);
    await bot.sendMessage(chatId, "Aó, s'è incastrato tutto… riprova! ❤️");
  }
}
