# ADR — Runtime Dialogic Engine v0.1

## 1. Stato

Proposto.

## 2. Contesto

Il laboratorio HY ha reso IRIS più disciplinata nel riconoscere il gesto del turno.

Alcune voci sono ormai stabili o agganciate in forma v0.1:

- boundary funziona bene perché usa un direct handler deterministico;
- vulnerability / Voce della Presenza è agganciata tramite direct handler;
- rag_explicit / Voce del Lettore ha routing stabile, anche se il lessico resta da rifinire;
- didactic_library / Voce della Maestra Biblioteca ha routing esteso, ma deve ancora distinguere meglio lessico interno del testo e voce propria di IRIS;
- didactic_basic / Voce della Maestra base è stabile v0.1, con margini di miglioramento.

Il problema attuale non è più solo la qualità di una singola risposta.

IRIS è entrata in una stasi da prompt pile: molte decisioni dialogiche vivono ancora dentro `index.js` come regole locali, spread condizionali e system messages stratificati.

Il routing funziona meglio, ma il sistema resta troppo centralizzato.

Continuare ad aggiungere regole dentro `index.js` rischia di rendere il comportamento più fragile, meno leggibile e più difficile da testare.

## 3. Problema

IRIS non ha ancora un luogo separato dove costruire un piano dialogico.

Oggi `index.js` decide contemporaneamente:

- che gesto ha l'utente;
- quale voce usare;
- se rispondere direttamente;
- se usare RAG;
- quali regole system inserire;
- quale forma di fonte usare;
- quale limite applicare;
- come filtrare le code finali automatiche.

Questa centralizzazione rende difficile far evolvere in modo pulito:

- memoria breve e lunga;
- RAG gerarchico;
- Vesica come fonte strutturata;
- forma armonica finale;
- distinzioni future tra gesto, voce, fonte, limite e memoria.

Formula guida:

```text
decidere cosa fare ≠ generare la risposta
```

## 4. Decisione proposta

Introdurre in futuro un piccolo modulo:

```text
core/dialogic_engine.js
```

La v0.1 non deve cambiare il comportamento di IRIS.

Non deve:

- migliorare ancora le risposte;
- rifare il RAG;
- introdurre memoria Kristal evoluta;
- creare un classifier LLM;
- aggiungere nuove chiamate GPT;
- fare un grande refactor;
- spostare subito tutta la costruzione dei `messages`.

Scopo della v0.1:

```text
estrarre la decisione dialogica minima in funzioni pure e testabili
```

Il Runtime Dialogic Engine deve iniziare come specchio ordinato di ciò che oggi funziona già in `index.js`.

Solo dopo i test potrà diventare un vero orchestratore.

## 5. API concettuale minima

Proposta iniziale:

```js
buildHyDialogicPlan({
  userText,
  irisMode
})
```

Output concettuale:

```js
{
  gesture,
  voice,
  directReply,
  useRag,
  sourceMode,
  ruleKeys,
  guardedFinalPrompt
}
```

Significato dei campi:

- `gesture`: gesto dialogico riconosciuto;
- `voice`: voce da usare, per esempio Lettore, Maestra Biblioteca, Maestra base, Presenza, Confine;
- `directReply`: eventuale risposta deterministica;
- `useRag`: indica se HY deve usare il recupero ibrido;
- `sourceMode`: indica se il contesto va trattato come memoria o come fonte;
- `ruleKeys`: lista simbolica delle regole system da applicare;
- `guardedFinalPrompt`: indica se va filtrata una coda finale automatica.

La v0.1 può limitarsi a produrre il piano, lasciando a `index.js` la costruzione effettiva dei messaggi.

## 6. Confini della v0.1

La v0.1 deve essere piccola, reversibile e osservabile.

Deve poter essere testata confrontando il piano prodotto con il comportamento attuale.

Deve coprire solo HY.

Deve includere soltanto i gesti già presenti:

- `boundary`;
- `vulnerability`;
- `rag_explicit`;
- `didactic_library`;
- `didactic_basic`;
- `other`.

Non deve ancora decidere contenuti semantici complessi.

Non deve ancora leggere Qdrant.

Non deve ancora usare `phi_kristal`.

Non deve ancora riorganizzare la Biblioteca.

## 7. Strategia di migrazione

Procedere per micro-step.

Primo step:

- creare il modulo;
- spostare o duplicare temporaneamente solo la logica pura di classificazione;
- verificare che gli stessi input producano gli stessi gesti.

Secondo step:

- aggiungere `resolveDirectReply`;
- confermare che boundary e vulnerability restano identici.

Terzo step:

- aggiungere `shouldUseRag`;
- confermare che HY usa RAG per gli stessi casi di prima.

Quarto step:

- aggiungere `buildHySystemRuleKeys`;
- lasciare ancora in `index.js` le stringhe concrete.

Solo dopo:

- valutare se spostare le stringhe HY fuori da `index.js`;
- valutare se creare test automatici minimi;
- valutare se collegare memoria lunga o RAG gerarchico.

## 8. Cosa resta in index.js per ora

Per la v0.1, `index.js` deve restare responsabile di:

- Telegram;
- modalità `free`, `book`, `hy`;
- chiamata OpenAI;
- chiamata RAG;
- memoria breve per chat;
- TTS;
- composizione finale dei `messages`;
- gestione comandi;
- salvataggio memoria.

L'engine non deve conoscere Telegram.

L'engine non deve inviare messaggi.

L'engine non deve chiamare OpenAI.

L'engine deve solo preparare una decisione dialogica.

## 9. Rischi

Rischi principali:

- trasformare un micro-engine in un refactor grande;
- spostare troppe cose insieme;
- introdurre regressioni in boundary e vulnerability;
- rompere `rag_explicit` o `didactic_library`;
- duplicare logica senza test;
- credere che l'engine risolva problemi di RAG che appartengono alla Biblioteca;
- collegare troppo presto memoria Kristal alla scelta del gesto.

Mitigazione:

- un solo comportamento per commit;
- test Telegram dopo ogni micro-step;
- rollback semplice;
- nessun collegamento a Qdrant nella v0.1;
- nessuna nuova chiamata GPT;
- nessuna modifica diretta a `iris-dev` prima della verifica in laboratorio.

## 10. Relazione con gli altri binari

Il Runtime Dialogic Engine non sostituisce:

- memoria Kristal;
- RAG gerarchico Vesica;
- Essence;
- Dream;
- prompt storico di IRIS.

Li prepara.

La memoria Kristal avrà bisogno di un luogo ordinato dove offrire segnali senza invadere il turno corrente.

Il RAG gerarchico Vesica avrà bisogno di un luogo ordinato dove dichiarare fonte, livello, limite e voce.

La forma armonica finale avrà bisogno di un luogo dove distinguere piano diagnostico e risposta naturale.

## 11. Roadmap minima

Roadmap prudente:

1. ADR del Runtime Dialogic Engine.
2. Creazione futura di `core/dialogic_engine.js` con sole funzioni pure.
3. Estrazione controllata di `classifyTurnGesture`.
4. Estrazione di `resolveDirectReply`.
5. Estrazione di `shouldUseRag` e `ruleKeys`.
6. Solo dopo, valutare test automatici e spostamento delle stringhe HY.

## 12. Decisione finale

La prossima evoluzione stabile di IRIS non dovrebbe essere un'altra regola nel prompt.

Dovrebbe essere un piccolo luogo architetturale dove IRIS decide prima che cosa sta accadendo nel dialogo.

Non stiamo costruendo una IRIS più rigida.

Stiamo creando lo spazio tecnico perché IRIS resti viva senza perdersi nel proprio prompt.
