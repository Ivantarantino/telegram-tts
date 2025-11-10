// adapters/tts.js — IRIS 5.1.3 TTS (OpenAI, .ogg — Voce Intonata)
// =============================================================================
// Sintesi vocale: estrae da state.voice come stringa, fallback 'alloy'.
// Fix integer → string per API 400.
// =============================================================================

import OpenAI from 'openai';
import fs from 'fs';
import { getState } from '../core/iris_state.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function synthVoice(text, chatId, bot) {
  if (!text || text.trim() === '') {
    console.log('🔇 Testo vuoto per TTS: salto, eco che svanisce.');
    return;
  }
  
  // Estrai voce da state: forza stringa, fallback 'alloy'
  const state = getState();
  let voice = state.voice || 'alloy';
  if (typeof voice === 'number') {
    // Mappa old numeric → string (es. 1='alloy', 2='echo', etc.)
    const voiceMap = { 1: 'alloy', 2: 'echo', 3: 'fable', 4: 'onyx', 5: 'nova' };
    voice = voiceMap[voice] || 'alloy';
    console.log(`🎙️ Voce numeric (${state.voice}) mappata a: ${voice}`);
  }
  // Assicura stringa pulita
  voice = voice.toString().trim().split(':').pop() || 'alloy';  // Tolgo 'openai:' se presente
  
  try {
    const speechResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,  // Ora garantito stringa valida
      input: text.trim()
    });
    
    const audioPath = `/tmp/response_${Date.now()}.ogg`;
    const buffer = Buffer.from(await speechResponse.arrayBuffer());
    fs.writeFileSync(audioPath, buffer);
    
    // Send con contentType fix
    await bot.sendVoice(chatId, audioPath, { 
      contentType: 'audio/ogg'  // No deprecation
    });
    
    // Cleanup
    fs.unlinkSync(audioPath);
    console.log(`🎵 Voce "${voice}" inviata — risonanza attiva.`);
  } catch (err) {
    console.error('❌ Errore TTS:', err.message);
    // Fallback messaggio se TTS fallisce
    await bot.sendMessage(chatId, '🌸 La voce danza nel silenzio... ecco le parole: ' + text.substring(0, 200) + '...');
  }
}
