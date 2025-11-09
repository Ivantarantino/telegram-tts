// ===========================================
// IRIS Whisper — STT Stub (4.7)
// Da Rapporto_2: TranscribeVoice simulata, no crash su filePath
// ===========================================

export async function transcribeVoice(filePath) {
  console.log("🎙️ transcribeVoice stub", filePath);
  return "Trascrizione simulata: la voce del cuore.";  // Stabile
}

export { transcribeVoice as whisperTranscribe };
