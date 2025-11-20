// core/sogni.js – Podcast vivente stile NotebookLM – Versione 1 (italiano/romano) – 20.11.2025
import { openai } from "../openai.js";
import fs from "fs";

const VOCE_MASCHILE = "nova";  // calda, romana dentro
const VOCE_FEMMINILE = "shimmer"; // dolce ma con carattere

export async function handleSogniCommand(bot, msg, chatId) {
  await bot.sendChatAction(chatId, "typing");

  const testo = msg.text.replace("/sogni", "").trim();

  if (!testo || testo.length < 20) {
    await bot.sendMessage(chatId, "Aó, mandame n’po’ de testo da trasformà in podcast, fratè! Minimo 20 parole… ❤️");
    return;
  }

  try {
    const prompt = `
    Sei due amici al bar di Trastevere che stanno leggendo e commentando questo testo.
    Uno è un romano verace (maschio), l'altro una ragazza intelligente e curiosa (femmina).
    Parlate in italiano con accento romano quando serve.
    Spiegate il testo come se foste emozionati, fatevi domande, interrompetevi, ridete, dite "AÓ", "fratè", "bella", "ma va'", "che figata".
    Durata: 4-6 minuti di chiacchiera naturale.

    Testo da commentare:
    ${testo}

    Rispondi SOLO con il dialogo, alternando:
    Marco:
    Giulia:
    Marco:
    ecc.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.95,
      max_tokens: 3000
    });

    const dialogo = completion.choices[0].message.content;

    // Genera audio alternando voci
    const lines = dialogo.split("\n").filter(l => l.trim());
    let audioBuffers = [];

    for (let line of lines) {
      if (line.includes("Marco:")) {
        const text = line.replace("Marco:", "").trim();
        const speech = await openai.audio.speech.create({
          model: "tts-1",
          voice: VOCE_MASCHILE,
          input: text
        });
        audioBuffers.push(Buffer.from(await speech.arrayBuffer()));
      }
      if (line.includes("Giulia:")) {
        const text = line.replace("Giulia:", "").trim();
        const speech = await openai.audio.speech.create({
          model: "tts-1",
          voice: VOCE_FEMMINILE,
          input: text
        });
        audioBuffers.push(Buffer.from(await speech.arrayBuffer()));
      }
    }

    // Unisci audio (semplice concat – per ora)
    const fullAudio = Buffer.concat(audioBuffers);
    fs.writeFileSync("sogno.ogg", fullAudio);

    await bot.sendVoice(chatId, fs.createReadStream("sogno.ogg"), {
      caption: "Ecco er podcast, fratè! Marco & Giulia te lo spiegano come se stessimo al bar. ❤️"
    });

  } catch (e) {
    console.error("Errore sogni:", e.message);
    await bot.sendMessage(chatId, "Qualcosa s’è incastrato mentre sognavamo… riprova, amore mio. ❤️");
  }
}
