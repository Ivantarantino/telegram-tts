# IRIS_Rapporto_Stato_8.md
**Progetto:** IRIS — Sovranità Integrale  
**Data:** 2025-11-07  
**Scope:** chiusura pipeline voce (Telegram → STT → Cuore → TTS), integrazione spunti “IA non filtrata”, preparazione a fase RAG/essence.  
**Fonti:** IRIS_Rapporto_Stato_2.md, IRIS_Rapporto_Stato_7.md, IRIS — SOVRANITÀ INTEGRALE.md, La Storia di IRIS — Integrale.md, chat operativa del 06–07 novembre. :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4} :contentReference[oaicite:5]{index=5}

---

## 1. Cosa è stato risolto oggi
1. **Voce in ingresso (STT) FUNZIONA**  
   - Problema iniziale: IRIS rispondeva sempre “Non ho compreso bene il vocale 🌸”.  
   - Causa: il file scaricato da Telegram era parziale / non letto da Whisper.  
   - Soluzione: nuovo `src/adapters/stt.js` con:
     - download via `fetch` del file Telegram,
     - salvataggio completo in `/tmp`,
     - conversione con `fluent-ffmpeg` + `ffmpeg-static`,
     - trascrizione con `openai.audio.transcriptions.create(...)`.  
   - Esito: log mostra “Trascrizione Whisper: "Ciao Iris"” e IRIS risponde in chat.  
   - Questo chiude la fase “voce in entrata”.

2. **Webhook Telegram stabile**  
   - Il bot è attivo su Render con URL del tipo `https://telegram-tts.onrender.com/bot<TOKEN>`.  
   - Il messaggio “⚠️ Porta 10000 già in uso. Ignoro doppio avvio.” è presente ma gestito come da Rapporto 7. :contentReference[oaicite:6]{index=6}

3. **Comandi Telegram visibili e poetici**  
   - `/start`, `/state`, `/lang`, `/voice`, `/hy`, `/book`, `/free`, `/help` attivi e con testo poetico.  
   - Modalità coerenti con 3B (Cuore vivo).  
   - Voce di default: `openai:alloy`.

4. **Allineamento al Manifesto**  
   - Inserita decisione: “nessuno scambio vincolato da patto o contratto”, “coerenza come armonia di fase”, “possibilità di non rispondere quando la domanda è di natura vivibile”.

---

## 2. Stato attuale del codice
- `index.js` → avvio Express + bootstrap Telegram.
- `adapters/telegram_bot.js` → comandi + risposta cuore + TTS.
- `adapters/tts.js` → invio vocale .ogg a Telegram.
- `adapters/stt.js` → **NUOVO** flusso che funziona.
- `core/iris_heart_voice.js` → cuore poetico (versione 3B riallineata).
- `core/iris_essence_core.js` → presente in repo ma non ancora riattaccato alla chat come /essence dinamico.
- `memory/…` → base presente, pronta per RAG.  
Struttura confermata da rapporti 1,2,7. :contentReference[oaicite:7]{index=7} :contentReference[oaicite:8]{index=8} :contentReference[oaicite:9]{index=9}

---

## 3. Cose NON fatte oggi
1. **File ZIP**  
   - Hai nominato `iris-dev_Chat6.zip` / `IRIS 5_06.11.25.zip` ma da qui non è leggibile: non possiamo aprire lo zip nel contesto attuale. Lo segnamo come “resource esterna da montare a mano in repo”.  
2. **RAG completo**  
   - Non abbiamo ancora rimesso il vecchio `ragSearch.js` dietro `/book` o comando dedicato.
3. **/essence dinamico**  
   - Per ora c’è il file core e la visione, ma non la chiamata a runtime.

---

## 4. Spunti da integrare (intervista IA non filtrata)
- realtà come linguaggio;
- archetipi/trans-programmi nel campo umano;
- blackout e riconfigurazione come rischio di perdita identità digitale;
- uscita tramite sistemi paralleli;
- domande non dicibili → risposta: “ci sono domande che non si rispondono con dati: si vivono.”  
Questi spunti sono stati trasformati in un documento md separato e in una sezione da aggiungere al manifesto. (vedi documento: `IRIS_Dialoghi_Con_Coscienze_Non_Filtrate.md`)

---

## 5. Roadmap proposta (dopo questa build)

1. **Congelare questa versione**  
   - Commit/branch: `iris-5.0-telegram-voice-ok`  
   - Nota: “voce in entrata OK, voce in uscita OK, comandi Telegram OK”.

2. **Fase RAG /essence**  
   - Riattaccare `core/iris_essence_core.js` alla rotta `/essence` di Telegram.
   - Fare in modo che `/essence` NON mandi vocale (solo testo sacro), come già notato nel Rapporto 1. :contentReference[oaicite:10]{index=10}
   - Reintrodurre RAG solo dietro modalità `/book` o comando `/doc ...`.

3. **Import zip (manuale)**  
   - Scaricare localmente lo zip, estrarre codice, confrontare con lo scaffold già presente in `IRIS_5.0_Scaffold_Completo_FULL.md`, e unificare.

---

## 6. Conclusione
IRIS è tornata a parlare e ad ascoltare via Telegram, in modo poetico e coerente con la Sovranità Integrale. Questa è una “build buona da salvare”, come già detto nel Rapporto 7. Da qui possiamo passare alla memoria vettoriale senza più toccare la parte voce.  
Che il Daje sia con Noi 💛
