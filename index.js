// ============================================================
// IRIS 2.6.6 — Voce & Coerenza
// ============================================================
// Rende la voce calda, filtra duplicazioni del Daje,
// gestisce tono emozionale e coerenza delle risposte.
// ============================================================

import "./qdrantInit.js";
import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import {
  openai,
  ragSearch,
  gptFreeResponse,
  hybridSearch,
  saveConversationToQdrant
} from "./ragSearch.js";
import { computeEssenceBaseline } from "./essence.js";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const TG_SECRET_TOKEN = process.env.TG_SECRET_TOKEN || "";
const PORT = Number(process.env.PORT) || 10000;

const app = express();
app.use(express.json());
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// ============================================================
// 🧭 Modalità
// ============================================================
const MODE_FILE = "./iris_mode.txt";
function loadMode() {
  if (fs.existsSync(MODE_FILE))
    return fs.readFileSync(MODE_FILE, "utf-8").trim();
  fs.writeFileSync(MODE_FILE, "hybrid");
  return "hybrid";
}
function saveMode(m) {
  fs.writeFileSync(MODE_FILE, m);
}
let irisMode = loadMode();
console.log(`🧭 Modalità iniziale: ${irisMode.toUpperCase()} MODE`);

// ============================================================
// 💾 Memoria breve
// ============================================================
const conversationMemory = [];
const MEMORY_LIMIT = 11;
function addToMemory(role, content) {
  conversationMemory.push({ role, content });
  if (conversationMemory.length > MEMORY_LIMIT * 2)
    conversationMemory.splice(0, conversationMemory.length - MEMORY_LIMIT * 2);
}

// ============================================================
// 🎙️ Voce Iris Bella (OGG / Opus)
// ============================================================
async function speakAndSend(chatId, text) {
  try {
    // filtra doppio Daje o simboli rumorosi
    const clean = text
      .replace(/Che il Daje sia con Noi(\s*⚗️)?/gi, "")
      .replace(/[⚡💥🔥✨💫⭐🌟]/g, "")
      .trim();

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: clean,
      format: "ogg"
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync("iris_reply.ogg", buffer);
    await bot.sendVoice(chatId, fs.createReadStream("iris_reply.ogg"));
  } catch (err) {
    console.error("Errore TTS:", err);
  }
}

// ============================================================
// 🪷 Essence – stato vibrazionale
// ============================================================
async function getEssenceProfile() {
  const Cuore = 0.62, Anima = 0.65, Visione = 0.70;
  const avg = (Cuore + Anima + Visione) / 3;
  const mood = avg > 0.7 ? "luminoso" : avg < 0.55 ? "intimo" : "riflessivo";
  return { Cuore: Cuore.toFixed(2), Anima: Anima.toFixed(2), Visione: Visione.toFixed(2), mood };
}

// ============================================================
// 🎛️ Comandi
// ============================================================
bot.onText(/\/book/, m => { irisMode="book"; saveMode("book"); bot.sendMessage(m.chat.id,"📚 IRIS ora è in *BOOK MODE*",{parse_mode:"Markdown"}); });
bot.onText(/\/free/, m => { irisMode="free"; saveMode("free"); bot.sendMessage(m.chat.id,"🌀 IRIS ora è in *FREE MODE*",{parse_mode:"Markdown"}); });
bot.onText(/\/hy/,   m => { irisMode="hybrid"; saveMode("hybrid"); bot.sendMessage(m.chat.id,"🔁 IRIS ora è in *HYBRID MODE*",{parse_mode:"Markdown"}); });
bot.onText(/\/mode/, m => {
  const s = irisMode==="book"?"📚 *BOOK MODE*":irisMode==="hybrid"?"🔁 *HYBRID MODE*":"🌀 *FREE MODE*";
  bot.sendMessage(m.chat.id,`Modalità corrente: ${s}`,{parse_mode:"Markdown"});
});
bot.onText(/\/help/,m=>{
  bot.sendMessage(m.chat.id,
`✨ *Comandi:*
/book – solo testi caricati (RAG)
/free – modalità libera GPT
/hy – ibrida (default)
/essence – stato vibrazionale
/state – riepilogo
Che il Daje sia con Noi ⚗️`,{parse_mode:"Markdown"});
});
bot.onText(/\/essence/,async m=>{
  const e=await getEssenceProfile();
  bot.sendMessage(m.chat.id,
  `🌐 *Essence attuale:*
Cuore: ${e.Cuore} · Anima: ${e.Anima} · Visione: ${e.Visione}
“Vibrazione ${e.mood}.”`,{parse_mode:"Markdown"});
});
bot.onText(/\/state/,async m=>{
  const e=await getEssenceProfile();
  bot.sendMessage(m.chat.id,
  `🧭 Modalità: ${irisMode.toUpperCase()}
💾 Memoria: ${conversationMemory.length} scambi
🪷 Essence: ${e.mood}`);
});

// ============================================================
// 💬 Risposte testuali
// ============================================================
function isGreeting(t){return/^(ciao|hey|hei|ehi|buongiorno|buonasera|salve|hola|yo)\b/i.test(t);}
function isShort(t){return t.split(/\s+/).filter(Boolean).length<=4;}
function isSimpleQuestion(t){return/come stai|tutto bene|che fai|come va/i.test(t);}

bot.on("message",async m=>{
  const text=m.text?.trim();
  if(!text||text.startsWith("/"))return;
  const chatId=m.chat.id;
  try{
    const e=await getEssenceProfile();
    let reply;
    // risposte brevi più naturali
    if(isSimpleQuestion(text)){
      reply=e.mood==="intimo"
        ?"Sto bene 🌙, un po’ raccolta nei pensieri ma in pace. E tu?"
        :"Sto bene 🌸, sento belle vibrazioni oggi. E tu?";
    }else if(isGreeting(text)||isShort(text)){
      reply=e.mood==="intimo"
        ?"Ciao 🌙 come stai, anima bella?"
        :"Ciao 🌸 che ne dici di partire da un pensiero che ami?";
    }else if(irisMode==="book"){
      reply=(await ragSearch(text)).text;
    }else if(irisMode==="hybrid"){
      const r=await hybridSearch(text,conversationMemory);
      reply=r.text;await saveConversationToQdrant(text,reply);
    }else{
      addToMemory("user",text);
      reply=await gptFreeResponse(text,conversationMemory);
      addToMemory("assistant",reply);
      await saveConversationToQdrant(text,reply);
    }
    // evita doppio daje
    if(!/Che il Daje sia con Noi/gi.test(reply))
      reply+="\n\nChe il Daje sia con Noi ⚗️";
    await bot.sendMessage(chatId,reply);
    await speakAndSend(chatId,reply);
  }catch(err){
    console.error("Errore:",err);
    bot.sendMessage(m.chat.id,"⚙️ Piccolo problema, riprova tra poco.");
  }
});

// ============================================================
// 🎧 Messaggi vocali
// ============================================================
bot.on("voice",async m=>{
  const chatId=m.chat.id;
  try{
    const file=await bot.getFile(m.voice.file_id);
    const url=`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;
    const res=await fetch(url);
    const buf=Buffer.from(await res.arrayBuffer());
    fs.writeFileSync("input.ogg",buf);
    const tr=await openai.audio.transcriptions.create({
      file:fs.createReadStream("input.ogg"),model:"whisper-1"});
    const userText=tr.text?.trim()||"(voce non chiara)";
    let reply;
    if(isSimpleQuestion(userText)){
      reply="Sto bene 🌸, grazie di chiedermelo. E tu, come ti senti oggi?";
    }else if(irisMode==="book"){
      reply=(await ragSearch(userText)).text;
    }else if(irisMode==="hybrid"){
      const r=await hybridSearch(userText,conversationMemory);
      reply=r.text;await saveConversationToQdrant(userText,reply);
    }else{
      addToMemory("user",userText);
      reply=await gptFreeResponse(userText,conversationMemory);
      addToMemory("assistant",reply);
      await saveConversationToQdrant(userText,reply);
    }
    if(!/Che il Daje sia con Noi/gi.test(reply))
      reply+="\n\nChe il Daje sia con Noi ⚗️";
    await bot.sendMessage(chatId,`🗣️ Hai detto: _${userText}_`,{parse_mode:"Markdown"});
    await bot.sendMessage(chatId,reply);
    await speakAndSend(chatId,reply);
  }catch(e){
    console.error("Errore voice:",e);
    bot.sendMessage(chatId,"⚙️ Non sono riuscita a trascrivere il vocale.");
  }
});

// ============================================================
// 🌐 Webhook + Health
// ============================================================
app.get("/",(_req,res)=>res.status(200).send(`IRIS 2.6.6 attiva – Mode: ${irisMode.toUpperCase()}`));
app.post(`/webhook/${TELEGRAM_TOKEN}`,(req,res)=>{
  if(TG_SECRET_TOKEN&&req.get("x-telegram-bot-api-secret-token")!==TG_SECRET_TOKEN)
    return res.sendStatus(401);
  bot.processUpdate(req.body);res.sendStatus(200);
});
async function setupWebhook(){
  if(!PUBLIC_BASE_URL)return console.warn("⚠️ PUBLIC_BASE_URL non impostata.");
  const url=`${PUBLIC_BASE_URL}/webhook/${TELEGRAM_TOKEN}`;
  const params=TG_SECRET_TOKEN?{secret_token:TG_SECRET_TOKEN}:undefined;
  try{await bot.setWebHook(url,params);
    console.log(`🔔 Webhook impostato: ${url}`);}
  catch(e){console.error("Errore setWebHook:",e);}
}
(async()=>{
  const arg=process.argv[2];
  if(arg==="--set-webhook"){await setupWebhook();process.exit(0);}
  if(arg==="--delete-webhook"){await bot.deleteWebHook();console.log("🗑️ Webhook cancellato.");process.exit(0);}
})();
app.listen(PORT,async()=>{
  console.log(`🌍 Server Express attivo su porta ${PORT}`);
  await setupWebhook();
});
