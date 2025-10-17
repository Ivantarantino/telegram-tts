// === IRIS — Telegram Voice Assistant ===
// Autore: Ivano + GPT-5
// Ultimo aggiornamento: ottobre 2025

import express from "express";
import TelegramBot from "node-telegram-bot-api";
import googleTTS from "google-tts-api";
import OpenAI from "openai";
import fetch from "node-fetch";
import fs from "fs";
import https from "https";

// === CONFIG ===
const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === AVVIO BOT ===
const bot = new TelegramBot(TOKEN, { polling: true });
console.log("🤖 IRIS avviata e in ascolto...");

// === STATO MEMORIA CHAT ===
const lastMessages = {}; // per gestire trigger vocali

// === COMANDI BASE ===
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🌸 Ciao, sono IRIS.\nParlami o scrivimi, e ti risponderò con la mia voce.\nPuoi anche dirmi: *Iris ascolta* e poi mandarmi un vocale.",
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "💡 Comandi disponibili:\n\n" +
      "• /start — Presentazione di IRIS\n" +
      "• /voce — Cambia voce (A, B, C, D)\n" +
      "• /modello — Mostra modello GPT in uso\n" +
      "• /stato — Mostra stato connessione\n\n" +
      "🎙️ Oppure scrivi *Iris ascolta* e poi inviami un vocale."
  );
});

bot.onText(/\/stato/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ IRIS è online e pronta.");
});

bot.onText(/\/modello/, (msg) => {
  bot.sendMessage(msg.chat.id, "🧠 Sto usando il modello `gpt-4o-mini` di OpenAI.");
});

// === CAMBIO VOCE ===
let voce = "it-IT-Standard-B"; // default: femminile calda

bot.onText(/\/voce (.+)/, (msg, match) => {
  const scelta = match[1].trim().toUpperCase();
  const voci = {
    A: "it-IT-Standard-A", // femminile più chiara
    B: "it-IT-Standard-B", // femminile calda
    C: "it-IT-Standard-C", // maschile neutro
    D: "it-IT-Standard-D", // maschile profondo
  };

  if (voci[scelta]) {
    voce = voci[scelta];
    bot.sendMessage(msg.chat.id, `🔊 Voce cambiata in ${scelta}.`);
  } else {
    bot.sendMessage(msg.chat.id, "❌ Voce non valida. Usa: /voce A | B | C | D");
  }
});

// === MESSAGGI TESTUALI ===
bot.on("message", async (msg) => {
  if (msg.text && !msg.text.startsWith("/")) {
    lastMessages[msg.chat.id] = msg.text.toLowerCase();

    // Se è in gruppo, risponde solo se menzionata
    if (msg.chat.type !== "private" && !msg.text.toLowerCase().includes("@iris")) {
      return;
    }

    const testo = msg.text.replace(/@iris/gi, "").trim();
    if (!testo) return;

    console.log(`🧠 Testo ricevuto: ${testo}`);

    try {
      const risposta = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Rispondi in modo naturale e caldo, tono femminile." },
          { role: "user", content: testo },
        ],
      });

      const output = risposta.choices[0].message.content;
      console.log(`💬 Risposta: ${output}`);

      const url = googleTTS.getAudioUrl(output, {
        lang: "it",
        slow: false,
        host: "https://translate.google.com",
        tld: "it",
        voice: voce,
      });

      await bot.sendVoice(msg.chat.id, url);
    } catch (err) {
      console.error("Errore:", err);
      bot.sendMessage(msg.chat.id, "⚠️ Errore nell'elaborazione del messaggio.");
    }
  }
});

// === TRIGGER VOCALE: "Iris ascolta" ===
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || "utente";
  const lastText = lastMessages[chatId] || "";

  if (!lastText.includes("iris ascolta")) {
    console.log(`🎧 Ignoro vocale da ${username} — nessun trigger trovato`);
    return;
  }

  console.log(`🎙️ Ricevuto vocale da ${username} — elaborazione in corso...`);

  try {
    // Scarica file audio Telegram
    const fileId = msg.voice.file_id;
    const fileUrl = await bot.getFileLink(fileId);

    // Trascrizione vocale → testo
    const audioBuffer = await fetch(fileUrl).then((r) => r.arrayBuffer());
    const audioResponse = await openai.audio.transcriptions.create({
      file: new Blob([audioBuffer]),
      model: "gpt-4o-mini-transcribe",
    });

    const testo = audioResponse.text;
    console.log(`📝 Trascrizione: ${testo}`);

    // Elaborazione con GPT
    const risposta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Rispondi con tono calmo, voce femminile, empatica." },
        { role: "user", content: testo },
      ],
    });

    const output = risposta.choices[0].message.content;
    console.log(`💬 Risposta: ${output}`);

    // Genera voce
    const ttsUrl = googleTTS.getAudioUrl(output, {
      lang: "it",
      slow: false,
      tld: "it",
      voice: voce,
    });

    await bot.sendVoice(chatId, ttsUrl);
    console.log(`✅ Vocale inviato con successo a ${username}`);
  } catch (error) {
    console.error("❌ Errore durante l'elaborazione del vocale:", error);
    await bot.sendMessage(chatId, "Errore durante l'elaborazione della risposta.");
  }
});

// === SERVER EXPRESS (necessario per Render) ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌐 Server attivo su porta ${PORT}`);
});
