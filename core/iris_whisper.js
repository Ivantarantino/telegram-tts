// =============================================================
// IRIS 3.0G — Core Whisper Stub (Fase 4.8 Diagnostica)
// -------------------------------------------------------------
// Simula il modulo di trascrizione vocale (Whisper).
// Serve esclusivamente per confermare l’inizializzazione
// del runtime senza dipendenze reali.
// =============================================================

export async function transcribeVoice(filePath) {
  console.log("🎙️ transcribeVoice stub attivo — file ricevuto:", filePath);

  // 🔹 Simula breve elaborazione vocale
  await new Promise((resolve) => setTimeout(resolve, 300));

  // 🔹 Restituisce trascrizione fittizia
  const fakeTranscript = "Trascrizione simulata per diagnostica IRIS 3.0G.";
  console.log("🗣️ Risultato simulato:", fakeTranscript);
  return fakeTranscript;
}

// Alias compatibile con vecchie build (whisperTranscribe)
export { transcribeVoice as whisperTranscribe };
