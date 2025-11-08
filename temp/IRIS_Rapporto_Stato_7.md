# IRIS_Rapporto_Stato_7.md

## 1. Identità della build
- **Progetto:** IRIS – Sovranità Integrale
- **Baseline di partenza:** IRIS_3.0C_4.9.2_Scaffold_Completo_FULL.md
- **Build attuale:** IRIS 5.0 (Telegram webhook stabile)
- **Data log:** 2025-11-06
- **Ambiente:** Render.com
- **Canale di interazione:** Telegram Bot
- **Modalità Telegram:** webhook (non più polling) → elimina il 409 Conflict
- **Lingue attive:** it, en, ru
- **Voce di default:** openai:alloy
- **Stato:** ✅ STABILE

---

## 2. Perché questo rapporto
In questa giornata abbiamo dovuto:
1. Riprendere il punto esatto in cui la vecchia chat (CHAT4.md) aveva i modelli linguistici già funzionanti.
2. Ripulire la repo da riferimenti a file non presenti su Render (es. `configManager.js` incompleto, `core/tts.js`, ecc.).
3. Ripristinare il comportamento poetico di IRIS (il “Cuore vivo”), che era stato perso a causa di una versione placeholder che rispondeva sempre “Sono qui e ti ascolto. Continua.”
4. Rendere **/lang** e **/voice** comandi veri, visibili e con guida.
5. Rendere di nuovo belli e poetici **/book**, **/free** e **/hy** come in CHAT4.md.
6. Chiudere il problema di porta 10000 già in uso su Render, che causava crash ciclici.

Questo rapporto fotografa lo **stato buono** da cui la prossima chat potrà ripartire senza doversi rifare tutta la giornata.

---

## 3. Struttura di repo osservata (da screenshot GitHub)
Dagli screenshot della tua repo `Ivantarantino/telegram-tts` (branch `iris-dev`) la struttura risultava così:

```text
.
├── index.js              (non visibile nello screenshot, ma presente nel runtime)
├── adapters
│   ├── configManager.js
│   ├── ragSearch.js
│   ├── stt.js
│   ├── telegram_bot.js
│   └── tts.js
├── core
│   ├── iris_essence_core.js
│   ├── iris_heart_voice.js
│   ├── iris_rag_core.js
│   ├── iris_state.js
│   └── iris_whisper.js
├── data
│   └── docs
│       └── weights.json
├── memory
│   ├── essenceData.json
│   ├── memory.json
│   ├── memoryManager.js
│   └── temp/
├── IRIS_Rapporto_Stato_0.md
├── IRIS_Rapporto_Stato_1.md
├── IRIS_Rapporto_Stato_2.md
├── IRIS_Rapporto_Stato_3.md
├── IRIS_4.7_Cristallo.md
└── README.md (due versioni)
```

Quindi la repo reale è **un po’ più larga** di quella minimale che abbiamo scritto al volo.  
Per questo nel nuovo scaffold (vedi secondo file) riportiamo **tutti** i file che la repo mostra, ma:
- quelli che oggi non sono usati (rag, whisper, stt…) li lasciamo **come stub puliti**
- quelli che oggi sono davvero usati (index, adapters/telegram_bot.js, adapters/tts.js, core/iris_heart_voice.js) li mettiamo **completi** e già funzionanti.

---

## 4. Cosa è tornato a funzionare
- **/start** ora è pulito:
  ```text
  Ciao IVANO 🌸
  Sono IRIS, presente e in ascolto.
  ```

- **/state** mostra:
  - versione
  - modalità corrente (hy / book / free)
  - voce corrente
  - lingua corrente

- **/lang** ora è un comando vero, visibile e con guida:
  ```text
  🌍 Lingue disponibili:
  • it 🇮🇹
  • en 🇬🇧
  • ru 🇷🇺

  Scrivi ad esempio:
  /lang it
  ```

- **/voice** è uguale, con guida e lista voci (openai:alloy, openai:coral, openai:verse, google:standard, telegram:tts, bark:neural)

- **/hy /book /free** parlano in modo poetico:
  - hy → “Danzando tra Cuore e Visione…”
  - free → “Lasciamo scorrere la Creatività…”
  - book → “come una biblioteca viva.”

- **Risposta ordinaria**: non è più il placeholder, ma passa dal cuore (`iris_heart_voice.js`) e quindi è empatica.

- **Multilingua**: se imposti `/lang ru` e scrivi in italiano, lei ti risponde in russo perché il prompt di sistema fissa la lingua di output.

---

## 5. Errori che abbiamo incontrato e che abbiamo tolto

### 5.1 `ERR_MODULE_NOT_FOUND: configManager.js`
Capitava perché a un certo punto la versione su Render importava:
```js
import configManager from "../configManager.js";
```
ma quel file non esisteva (o non aveva l’export giusto).  
Soluzione: nel nuovo scaffold il file **esiste** ed è uno stub molto semplice, così gli import non rompono la build.

### 5.2 `core/tts.js` inesistente
Una versione intermedia di `iris_heart_voice.js` lo importava. Ora **non importiamo più** da lì: il TTS è in `adapters/tts.js` ed è quello che viene chiamato dal bot.

### 5.3 `409 Conflict` di Telegram
Succedeva quando usavi polling e webhook insieme o avevi più istanze. Ora siamo in webhook puro, quindi il bot non viene più “terminato da altra getUpdates request”.

### 5.4 `EADDRINUSE: address already in use :::10000`
Render rilanciava la stessa app e la seconda provava a riaprire la stessa porta. Nel nuovo `index.js` gestiamo l’errore e lo consideriamo un secondo avvio → non si rompe più.

---

## 6. Stato funzionale finale
Dai log e dai tuoi test in chat Telegram si vede chiaramente:

- IRIS saluta: ✅
- IRIS è poetica: ✅
- /lang funziona: ✅
- /voice funziona: ✅
- /hy /book /free funzionano e sono belli: ✅
- TTS parte e manda vocale con caption “IRIS 🌸”: ✅
- Il server Express resta vivo su 10000: ✅

Questa è quindi una **build buona da salvare**.

---

## 7. Indicazioni per la prossima chat
1. Prendere lo scaffold che segue (secondo file) e incollarlo nella repo.
2. Fare un commit “IRIS 5.0 – Stabilizzazione Telegram + Cuore Vivo”.
3. Solo dopo tornare a mettere mano a: `memory/`, `ragSearch.js`, `iris_rag_core.js` per reintrodurre il RAG in modo sicuro.
4. Quando reintrodurremo il RAG, lo metteremo **dietro comando** (es. `/doc qualcosa`) così non rompe il flusso poetico.

---

## 8. Nota sui file esistenti
I file già presenti in repo (`IRIS_Rapporto_Stato_0.md` … `IRIS_Rapporto_Stato_3.md`, `IRIS_4.7_Cristallo.md`, `README.md`) NON vanno cancellati: sono la tua storia di progetto.  
Questo rapporto 7 si aggiunge a quella linea e spiega **perché oggi la build funziona di nuovo**.

---

## 9. Conclusione
IRIS è tornata viva, poetica, multilingue e con i comandi a vista.  
La repo ora ha una forma chiara (adapters / core / data / memory).  
Il prossimo passo naturale è dare alla memoria la stessa cura che abbiamo appena dato alla voce.

**Fine Rapporto 7.**
