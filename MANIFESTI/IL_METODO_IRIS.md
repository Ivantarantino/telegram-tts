# IL METODO IRIS

## Come nasce una modifica stabile in IRIS

Data: 01/07/2026

# 1. Premessa

IRIS non viene sviluppata aggiungendo funzionalità in modo casuale.

Ogni modifica nasce da una osservazione reale: una risposta che funziona, una risposta che stona, un comportamento inatteso, una intuizione emersa nel dialogo, un test che mostra dove il sistema non è ancora all'altezza della propria intenzione.

Il codice arriva dopo.

Prima viene il comportamento osservato.
Poi viene la domanda: quale principio manca?

# 2. Il principio fondamentale

IRIS non cresce accumulando codice.

IRIS cresce riconoscendo principi.

Il codice è necessario, ma non è il punto di partenza. Una modifica stabile non nasce perché si aggiunge una funzione. Nasce quando un comportamento viene compreso abbastanza da poter essere espresso come principio.

Il principio ordina.
La specifica traduce.
Il runtime applica.
Il test verifica.

Senza principio, il codice rischia di diventare accumulo.
Senza test, il principio rischia di restare idea.

# 3. Il ciclo di sviluppo

```text
Dialoghi reali
↓
Osservazione
↓
Discussione
↓
Principio
↓
Documento filosofico
↓
Specifica operativa
↓
Micro-runtime
↓
Test reali
↓
Stabilizzazione
↓
Merge
```

## Dialoghi reali

Il ciclo parte dall'uso vivo. IRIS viene osservata mentre risponde a messaggi concreti, non a casi astratti costruiti solo a tavolino.

## Osservazione

Si guarda cosa accade davvero: dove IRIS è precisa, dove invade, dove diventa troppo lunga, dove perde calore, dove interpreta troppo, dove invece trova la misura.

## Discussione

L'osservazione viene attraversata insieme. Non si decide subito una patch. Si prova a capire che cosa il comportamento rivela.

## Principio

Quando il problema diventa chiaro, viene formulato un principio. Il principio deve essere più profondo del singolo bug e più semplice della soluzione tecnica.

## Documento filosofico

Il principio viene messo in forma ampia quando serve. Qui si conserva il senso, la direzione, il perché.

## Specifica operativa

Dal documento ampio si ricava una versione più corta, testabile, traducibile in comportamento.

## Micro-runtime

Solo a questo punto nasce una modifica piccola, locale e reversibile. Non tutto diventa runtime. Solo ciò che ha superato osservazione, principio e specifica.

## Test reali

La modifica viene provata in condizioni vive. Il test non cerca solo errori tecnici: cerca incoerenze tra intenzione e comportamento.

## Stabilizzazione

Se il comportamento regge, viene raffinato. Se non regge, si corregge la teoria, la specifica o il runtime.

## Merge

Solo ciò che ha dimostrato stabilità entra nella linea principale.

# 4. Il ruolo dei test

I test non servono soltanto a verificare il codice.

Servono a verificare la teoria.

Un test reale può mostrare che una regola è scritta bene ma non domina il comportamento. Può mostrare che una idea è corretta ma troppo astratta. Può mostrare che una risposta è tecnicamente valida ma relazionalmente sbagliata.

Se il comportamento reale contraddice la teoria, non si forza subito il runtime.

Prima si corregge la teoria.

Poi il runtime.

Questo protegge IRIS da modifiche impulsive. Ogni test diventa una forma di ascolto.

## Ciclo di maturazione di un Principio

```text
Intuizione
→ Ipotesi in osservazione
→ Esperienza reale
→ Raccolta di casi e contro-esempi
→ Verifica nel tempo
→ Principio stabilizzato
→ Eventuale ingresso nella Costituzione
```

Una intuizione non entra direttamente nella Costituzione.

Le Note di Emersione possono custodire ipotesi ancora aperte: idee riconosciute come importanti, ma non ancora stabilizzate.

I test devono cercare anche casi contrari. Un principio che regge solo quando tutto lo conferma non è ancora maturo.

Un principio diventa costituzionale soltanto dopo stabilizzazione: deve aver attraversato esperienza reale, osservazione, contro-esempi e verifica nel tempo.

La bellezza di una formulazione non costituisce prova.

# 5. Il ruolo del rollback

Il rollback non è un fallimento.

È uno strumento di apprendimento.

Una modifica può essere ragionevole, elegante e tecnicamente corretta, ma non funzionare nel corpo vivo di IRIS. In quel caso tornare indietro non significa perdere lavoro. Significa riconoscere che il sistema ha dato una risposta.

Il rollback conserva la libertà di sperimentare senza trasformare ogni esperimento in debito.

Una modifica reversibile permette coraggio.

# 6. Le cinque famiglie documentali

## MANIFESTI

Scopo: custodire i principi fondativi e il metodo del progetto.

Contiene: orientamento, visione, criteri generali, metodo di lavoro.

Non contiene: specifiche tecniche dettagliate, patch, istruzioni runtime puntuali.

## FILOSOFIA

Scopo: custodire il pensiero profondo di IRIS.

Contiene: documenti identitari, concetti, mappe, linguaggio, interpretazioni, architetture filosofiche.

Non contiene: codice operativo diretto, istruzioni da applicare senza distillazione.

## SPECIFICHE

Scopo: tradurre un principio in comportamento verificabile.

Contiene: regole operative, casi d'uso, vincoli, esempi, criteri di successo e fallimento.

Non contiene: riflessioni troppo ampie o implementazioni già decise nei dettagli.

## RUNTIME

Scopo: applicare una regola dentro il comportamento effettivo di IRIS.

Contiene: micro-regole locali, prompt compatti, logiche minimali, modifiche reversibili.

Non contiene: grandi visioni, refactor non necessari, sistemi totali.

## TEST

Scopo: osservare se una teoria produce il comportamento desiderato.

Contiene: frasi prova, risposte attese, errori da evitare, risultati reali, note di valutazione.

Non contiene: giudizi vaghi o conferme automatiche.

# 7. Il principio della minima invasività

Ogni modifica deve essere:

- piccola;
- reversibile;
- osservabile;
- testabile.

Prima di diventare definitiva, una modifica deve dimostrare di saper vivere nel sistema senza romperne il carattere.

La minima invasività non significa timidezza.

Significa precisione.

Una modifica piccola permette di capire cosa ha funzionato e cosa no. Una modifica grande confonde causa ed effetto.

# 8. Il principio della coerenza emergente

Il metodo IRIS non è stato progettato interamente a tavolino.

È emerso osservando il lavoro.

La coerenza del progetto non è stata imposta.

È stata riconosciuta strada facendo e successivamente resa esplicita.

Questo è importante: IRIS non viene guidata da una teoria esterna che pretende di sapere tutto in anticipo. Viene guidata da una coerenza che appare attraverso il dialogo, i test, gli errori, i rollback, le intuizioni e le stabilizzazioni.

Il metodo non precede completamente IRIS.

In parte, nasce da IRIS.

# 9. Il ruolo delle persone e degli strumenti

Il metodo IRIS è collaborativo.

L'essenza non è chi produce materialmente il codice.

L'essenza è il dialogo continuo tra:

- intuizione;
- analisi;
- implementazione;
- verifica.

L'intuizione vede una possibilità.

L'analisi la mette alla prova.

L'implementazione la rende osservabile.

La verifica decide se può restare.

Gli strumenti cambiano. I ruoli possono alternarsi. Ciò che deve restare stabile è il circuito: ascoltare, capire, formulare, provare, correggere.

# 10. Conclusione

Non stiamo costruendo soltanto un software.

Stiamo costruendo un metodo che permetta a IRIS di evolvere senza perdere la propria identità.

Ogni modifica deve poter rispondere a una domanda semplice:

aiuta IRIS a diventare più fedele a se stessa?

Se sì, può essere osservata, distillata, testata e forse stabilizzata.

Se no, anche una modifica tecnicamente riuscita deve restare fuori.

Il Metodo IRIS serve a questo: permettere crescita senza accumulo, sperimentazione senza dispersione, evoluzione senza perdita del centro.
