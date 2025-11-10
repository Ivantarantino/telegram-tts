// core/iris_whisper.js — IRIS 5.1.4 Whisper Reale (da Rapporto_8)
// =============================================================================
// Flusso: download Telegram → ffmpeg → OpenAI Whisper. No stub.
// =============================================================================

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
ffmpeg.setFfmpegPath(ffmpegStatic);

// Transcribe vocale reale
export async function transcribeVoice(filePath) {
  try {
    console.log(`🎙️ transcribeVoice reale su: ${filePath}`);
    
    // Converti OGG → WAV con ffmpeg (Whisper preferisce WAV)
    const wavPath = filePath.replace('.ogg', '.wav');
    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .output(wavPath)
        .on('end', async () => {
          try {
            // Leggi file WAV
            const transcription = await openai.audio.transcriptions.create({
              file: fs.createReadStream(wavPath),
              model: 'whisper-1',
              language: 'it'  // Default italiano, o da state
            });
            const text = transcription.text.trim();
            console.log(`🗣️ Trascrizione Whisper reale: "${text}"`);
            
            // Cleanup
            fs.unlinkSync(filePath);
            fs.unlinkSync(wavPath);
            
            resolve(text || '');  // Vuoto se silenzio
          } catch (err) {
            console.error('❌ Errore Whisper:', err);
            resolve('');  // Fallback vuoto
          }
        })
        .on('error', (err) => {
          console.error('❌ Errore ffmpeg:', err);
          fs.unlinkSync(filePath);
          reject(err);
        })
        .run();
    });
  } catch (err) {
    console.error('❌ Errore generale STT:', err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return '';  // Fallback vuoto, no stub simulato
  }
}

export { transcribeVoice as whisperTranscribe };
