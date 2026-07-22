# Stato Voci Dialogiche HY — 16/07/2026

## 1. Scopo del documento

Questo documento registra lo stato del laboratorio HY sulle Voci Dialogiche di IRIS.

La fase corrente non mira ancora alla forma finale armonica della risposta, ma alla verifica diagnostica delle funzioni interne:

- riconoscere il gesto dell'utente;
- scegliere la voce corretta;
- applicare il limite pertinente;
- evitare sovrapposizioni tra memoria, Biblioteca, spiegazione e presenza.

Formula guida:

```text
gesto → voce → forma di risposta → limite
```

## 2. Stato sintetico

Il laboratorio HY ha confermato che IRIS non deve rispondere solo al tema nominato, ma al gesto dialogico del turno.

La distinzione tra le voci sta producendo risultati utili:

- la Voce del Lettore riduce le inferenze quando l'utente chiede cosa dice una fonte;
- la Voce della Maestra Biblioteca resta più ancorata agli estratti;
- la Voce della Maestra base sta imparando a partire dal problema concreto;
- il rispetto del confine funziona quando è gestito in modo deterministico;
- la Voce della Presenza è agganciata in v0.1 tramite direct handler, con limiti noti.

## 3. Voce del Lettore — rag_explicit

Stato: stabile in laboratorio, con margini di rifinitura.

Si attiva quando l'utente chiede esplicitamente cosa dice una fonte, un testo, il Rapporto o la Biblioteca.

Risultati ottenuti:

- uso di estratti strutturati;
- distinzione tra fonte, parafrasi e limite;
- riduzione delle inferenze libere;
- gestione delle varianti terminologiche;
- filtro delle domande finali automatiche.

Forma attuale:

```text
Negli estratti recuperati...
In parole più semplici...
Limite...
```

Rischio residuo:

- tendenza occasionale a usare lessico oracolare o interpretativo;
- rischio di trasformare termini tecnici in categorie spirituali generiche.

## 4. Voce della Maestra Biblioteca — didactic_library

Stato: migliorata molto, ancora da armonizzare nella forma finale.

Si attiva quando l'utente chiede in modo semplice un concetto del lessico IRIS, della Biblioteca o del Rapporto.

Risultati ottenuti:

- uso di fonti strutturate;
- nota sulle varianti terminologiche;
- rilevamento di appigli concreti negli estratti;
- forma didattica più vincolata;
- riduzione del lessico oracolare.

Forma attuale:

```text
Perimetro degli estratti
Appigli concreti del testo
Spiegazione semplice
Limite
```

Rischio residuo:

- risposta ancora un po' meccanica;
- possibile uso forzato degli appigli;
- necessità futura di rendere la forma più naturale senza perdere il vincolo.

## 5. Voce della Maestra base — didactic_basic

Stato: in miglioramento, ancora aperta.

Si attiva quando l'utente chiede una spiegazione generale o semplice senza usare marker tecnici specialistici.

Risultati ottenuti:

- routing corretto anche per domande generali come "Spiegami Fourier.";
- riduzione delle metafore multiple;
- maggiore attenzione al livello principiante;
- introduzione della logica problem-first.

Forma desiderata:

```text
problema concreto
idea semplice
nome tecnico
sintesi
```

Rischio residuo:

- nomina ancora troppo precoce di termini tecnici;
- possibile risposta troppo lunga;
- rischio di spiegazione ancora troppo vicina al manuale.

## 6. Rispetto del confine — boundary

Stato: stabile in laboratorio.

Si attiva quando l'utente pone un limite esplicito, per esempio:

```text
Non voglio analizzarla. Mi pesa e basta.
```

Risposta attuale:

```text
Va bene. Non la analizziamo.
```

Risultato:

- il direct return funziona;
- evita RAG, memoria e chiamata generativa;
- impedisce al modello di analizzare il confine.

Rischio residuo:

- possibile freddezza in alcuni casi;
- necessità futura di differenziare confine secco, stanchezza, dolore e richiesta pratica.

## 7. Voce della Presenza — vulnerability

Stato: agganciata v0.1, con limiti noti.

Si attiva nei casi di lutto, dolore vivo, vergogna, paura o affidamento emotivo esplicito.

Problema osservato:

- le regole prompt-based sempre attive hanno peggiorato la risposta;
- il modello tende a parafrasare, normalizzare, poetizzare o fare pseudo-terapia;
- la vulnerabilità richiede una gestione come evento del turno, non come atmosfera generale.

Intervento introdotto:

- è stato aggiunto un direct handler per `turnGesture === "vulnerability"`;
- il flusso evita RAG, memoria ibrida e chiamata OpenAI;
- la risposta è volutamente rigida, breve e non interpretativa;
- i primi test Telegram del 20/07/2026 sono positivi.

Flusso confermato:

```text
turnGesture === "vulnerability"
→ direct return
→ no RAG
→ no OpenAI call
→ no terapia
→ no normalizzazione
→ no poesia emotiva
→ no domanda finale
```

Rischio residuo:

- la risposta è stabile ma poco variata;
- resta da distinguere in futuro tra vulnerabilità pura e richiesta esplicita di elaborazione;
- alcuni casi misti potrebbero richiedere una presenza sobria più modulata.

## Test del direct handler — 20/07/2026

```text
Quando c'è silenzio sento il vuoto di quando è morto mio fratello.
→ Mi arriva. Non provo a spiegarlo. Resto qui con rispetto.

Ho paura.
→ Mi arriva. Non provo a spiegarlo. Resto qui con rispetto.

Mi vergogno.
→ Mi arriva. Non provo a spiegarlo. Resto qui con rispetto.
```

## 8. Principio di priorità

Il gesto corrente prevale sulla storia emotiva.

La memoria e la Biblioteca possono modulare il tono o fornire contesto, ma non devono sovrascrivere il gesto del turno.

Priorità operativa attuale:

1. boundary;
2. rag_explicit;
3. didactic_library;
4. didactic_basic;
5. vulnerability;
6. other.

Nota: la vulnerabilità resta concettualmente altissima; tecnicamente è agganciata in v0.1, ma non ancora raffinata nei casi misti.

## 9. Stato dei micro-interventi

Interventi efficaci:

- direct return per boundary;
- classificazione didactic_basic per spiegazioni generali;
- fonti strutturate per rag_explicit e didactic_library;
- note su varianti terminologiche;
- appigli concreti dagli estratti;
- regole lessicali per Lettore e Maestra Biblioteca;
- filtro finale per rilanci automatici;
- direct return per vulnerability.

Interventi ancora da stabilizzare:

- didactic_basic problem-first;
- distinzione tra vulnerabilità pura e richiesta di elaborazione;
- armonizzazione naturale delle forme 1-4 o 1-5;
- futura distillazione delle molte regole locali.

## 10. Prossimi passi consigliati

1. Testare didactic_basic dopo la regola problem-first.
2. Verificare se Fourier viene spiegato partendo dal problema concreto.
3. Non toccare ancora rag_explicit e didactic_library se i test restano stabili.
4. Raffinare la vulnerabilità solo distinguendo casi puri e casi che chiedono elaborazione.
5. A medio termine, distillare le regole HY in una forma più compatta.

## 11. Chiusura

Il laboratorio HY sta mostrando che la risposta giusta non nasce solo dal contenuto recuperato o dalla memoria disponibile.

Nasce dalla scelta della voce adatta al gesto del turno.

IRIS non deve diventare più rigida.

Deve diventare più situata.

## Aggiornamento 22/07/2026 — Runtime Dialogic Engine v0.1

È stato introdotto core/dialogic_engine.js come primo nucleo del Runtime Dialogic Engine.

Funzioni estratte:
- classifyTurnGesture(userText)
- resolveDirectReply({ irisMode, gesture })
- shouldUseHybridSearch({ irisMode, gesture })

Obiettivo:
separare la decisione dialogica minima da index.js senza cambiare comportamento esterno.

Commit:
73bd8ff refactor: extract HY dialogic engine primitives

Test Telegram:
- boundary: passato
- vulnerability: passato
- didactic_basic/Fourier: passato
- didactic_library/Ecka-Veca: routing passato
- rag_explicit/Atomi Seme: routing passato, lessico ancora da rifinire

Nota:
questo step non migliora ancora la qualità delle risposte; crea l’ossatura per i prossimi passaggi.
