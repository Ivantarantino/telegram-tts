// adapters/tts.js — IRIS 5.1.8 TTS (Deprecation Dissolta)
// =============================================================================
// contentType 'audio/ogg' in sendVoice.
// =============================================================================

import OpenAI from 'openai';
import fs from 'fs';
import { getState } from '../core/iris_state.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function synthVoice(text, chatId, bot) {
  if (!text || text.trim() === '') {
    console.log('🔇 Testo vuoto per TTS: salto.');
    return;
  }
  
  const state = getState();
  let voice = state.voice || 'alloy';
  if (typeof voice === 'number') {
    const voiceMap = { 1: 'alloy', 2: 'echo', 3: 'fable', 4: 'onyx', 5: 'nova' };
    voice = voiceMap[voice] || 'alloy';
  }
  voice = voice.toString().trim().split(':').pop() || 'alloy';
  
  try {
    const speechResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text.trim()
    });
    
    const audioPath = `/tmp/response_${Date.now()}.ogg`;
    const buffer = Buffer.from(await speechResponse.arrayBuffer());
    fs.writeFileSync(audioPath, buffer);
    
    await bot.sendVoice(chatId, fs.createReadStream(audioPath), { contentType: 'audio/ogg' });  // Stream + contentType
    
    fs.unlinkSync(audioPath);
    console.log(`🎵 Voce "${voice}" inviata — risonanza attiva.`);
  } catch (err) {
    console.error('❌ Errore TTS:', err);
  }
}
