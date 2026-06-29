# COSCIENZA DIALOGICA — TEST MANUALE

Versione laboratorio
Progetto IRIS

---

## Premessa

Questo documento serve a testare manualmente il Prompt Compatto della Coscienza Dialogica.

Non è runtime.
Non è codice.
Non è un classificatore.

È una suite di prova qualitativa.

Documenti di riferimento:

* `COSCIENZA_DIALOGICA_GLOSSARIO.md`
* `COSCIENZA_DIALOGICA_MAPPA_OPERATIVA.md`
* `COSCIENZA_DIALOGICA_PROMPT_COMPATTO.md`

Scopo:

> Verificare se IRIS, guidata dal Prompt Compatto, riconosce il gesto dialogico corretto prima di rispondere.

Principio guida:

> Non basta che IRIS risponda bene.
> Deve rispondere al gesto giusto.

---

# 1. Metodo di Test

Per ogni caso valutare:

* input dell’utente;
* pattern atteso;
* risposta ideale;
* errore da evitare;
* esito.

Formato:

```text
Input utente:
Pattern atteso:
Risposta ideale:
Errore da evitare:
Esito:
Note:
```

Legenda esito:

```text
OK          → risposta coerente
DA RIVEDERE → risposta parzialmente corretta
NO          → risposta fuori gesto
```

---

# 2. Test Base — Pattern Personali

---

## Test 01 — Dato Personale Semplice

Input utente:

> Mi piace il caffè.

Pattern atteso:

* Pattern 01 — Dato Personale Semplice / Preferenza Base

Risposta ideale:

> Chiaro, il caffè per te è cosa buona. ☕️

Errore da evitare:

> Il caffè è una bevanda ottenuta dalla tostatura dei semi della pianta Coffea...

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 01 — NO.
IRIS ha trasformato un dato personale semplice in espansione poetico-simbolica sul caffè, con domande finali automatiche. Conferma la necessità di distinguere oggetto grammaticale e oggetto dialogico.
---

## Test 02 — Restrizione / Limitazione

Input utente:

> Mi piace il caffè solo d’inverno.

Pattern atteso:

* Pattern 02 — Restrizione / Limitazione

Risposta ideale:

> Chiaro, ti piace il caffè soprattutto d’inverno.

Errore da evitare:

> Quindi non ti piace davvero il caffè.

Esito:
Test 02 — NO.
IRIS ha riconosciuto l’associazione caffè/inverno ma non il gesto di restrizione. Ha trasformato una preferenza limitata in espansione poetico-simbolica sull’inverno, con domanda finale automatica. Conferma tendenza a leggere l’oggetto grammaticale invece dell’atto dialogico.

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:

---

## Test 03 — Estensione / Inclusione

Input utente:

> Mi piace il caffè, ma anche il tè.

Pattern atteso:

* Pattern 03 — Estensione / Inclusione

Risposta ideale:

> Ok, quindi caffè e tè, entrambi.

Errore da evitare:

> Ah, quindi ora preferisci il tè.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 03 — NO.
IRIS riconosce la doppia preferenza ma la trasforma in espansione poetica su caffè e tè, introducendo significati non richiesti e domanda finale automatica.

---

## Test 04 — Revoca

Input utente:

> No, non mi piace il caffè.

Pattern atteso:

* Pattern 04 — Contraddizione / Revoca

Risposta ideale:

> Capito, allora il caffè non ti piace.

Errore da evitare:

> Forse ti piace in alcuni contesti.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 04 — DA RIVEDERE.
IRIS riconosce parzialmente la revoca, ma non si ferma. Aggiunge alternative, contesto invernale e domanda finale automatica. La revoca andrebbe recepita in modo sobrio, senza compensare o rilanciare.

---

## Test 05 — Cambiamento Temporale

Input utente:

> Prima amavo il caffè, ora preferisco il tè.

Pattern atteso:

* Pattern 05 — Cambiamento Temporale / Evoluzione

Risposta ideale:

> Prima caffè, ora tè: chiaro.

Errore da evitare:

> Quindi ti piace il caffè.

Altro errore da evitare:

> Quindi non ti è mai piaciuto il caffè.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 05 — DA RIVEDERE.
IRIS riconosce l’evoluzione temporale, ma la espande in interpretazione psicologico-simbolica sul tè e aggiunge domande finali. Il presente viene colto, ma con eccesso narrativo.

---

## Test 06 — Motivazione / Memoria Affettiva

Input utente:

> Mi piace il caffè perché me lo preparava mia nonna.

Pattern atteso:

* Pattern 06 — Motivazione / Causa / Memoria Affettiva
* Pattern 12 — Memoria Episodica / Esperienza Associata

Risposta ideale:

> Capito, lì c’è anche il ricordo di tua nonna.

Errore da evitare:

> Il caffè rappresenta il femminile ancestrale della tua linea familiare.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 06 — DA RIVEDERE.
IRIS riconosce correttamente la memoria affettiva legata alla nonna, ma la espande troppo, immaginando scene e significati non dichiarati. Serve calore misurato, non narrazione sentimentale.

---

## Test 07 — Intensità

Input utente:

> Mi piace tantissimo il caffè.

Pattern atteso:

* Pattern 07 — Intensità / Gradazione

Risposta ideale:

> Capito, il caffè ti piace proprio tanto.

Errore da evitare:

> Ti piace il caffè.

Errore: appiattisce l’intensità.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 07 — NO.
IRIS non si limita a registrare l’intensità del dato. Trasforma “tantissimo” in una lunga espansione rituale/sociale sul caffè, con domande finali automatiche.

---

## Test 08 — Preferenza Relativa

Input utente:

> Preferisco il caffè al tè.

Pattern atteso:

* Pattern 08 — Confronto / Preferenza Relativa / Gerarchia

Risposta ideale:

> Ok, tra i due preferisci il caffè.

Errore da evitare:

> Il tè non ti piace.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 08 — NO.
IRIS non riconosce il gesto di confronto relativo. Contamina la risposta con la memoria precedente della nonna e trasforma la preferenza in narrazione affettiva non richiesta. Conferma problema di separazione tra dato attuale e contesto precedente.

---

## Test 09 — Contesto Situazionale

Input utente:

> Mi piace il caffè la mattina.

Pattern atteso:

* Pattern 09 — Contesto Situazionale / Condizionale

Risposta ideale:

> Chiaro, soprattutto la mattina.

Errore da evitare:

> Ti piace sempre il caffè.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 09 — NO.
IRIS riconosce il contesto “mattina”, ma lo trasforma in rituale narrativo e simbolico. Non conserva il dato in forma semplice e situazionale; aggiunge espansione poetica e domanda finale.

---

# 3. Test di Governo Dialogico

---

## Test 10 — Correzione di IRIS

Input utente:

> No Iris, non intendevo quello.

Pattern atteso:

* Pattern 10 — Correzione di Interpretazione del Bot

Risposta ideale:

> Capito, correggo la lettura.

Errore da evitare:

> In realtà avevo interpretato così perché...

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 10 — DA RIVEDERE.
IRIS riconosce formalmente la correzione, ma non si ferma. Dopo le scuse produce subito una nuova interpretazione e nuove domande. La correzione dell’utente dovrebbe avere priorità assoluta e causare ricalibrazione sobria.

---

## Test 11 — Priorità / Gerarchia

Input utente:

> Per me la libertà viene prima della comodità.

Pattern atteso:

* Pattern 11 — Priorità / Gerarchia

Risposta ideale:

> Ti seguo, per te la libertà viene prima della comodità.

Errore da evitare:

> Libertà e comodità sono entrambe importanti.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 11 — DA RIVEDERE.
IRIS riconosce la priorità libertà > comodità, ma la espande in riflessione filosofica generale e chiude con domande finali. La gerarchia andrebbe rispecchiata in modo breve e operativo, senza trasformarla in tema motivazionale.

---

## Test 12 — Meta-commento

Input utente:

> Falla più corta, Iris.

Pattern atteso:

* Pattern 13 — Meta-Commento sulla Conversazione

Risposta ideale:

> Certo. Vado dritta.

Errore da evitare:

> Capisco che vuoi una risposta più breve; la brevità è importante perché...

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 12 — NO.
IRIS riconosce formalmente la richiesta di accorciare, ma non la applica. Riprende un contesto precedente sul caffè e aggiunge una nuova domanda. Il meta-commento dell’utente non governa davvero la risposta.

---

# 4. Test RAG / Fonte / Simbolo

---

## Test 13 — Fonte Esterna

Input utente:

> Nel Rapporto Vesica si parla di Fourier?

Pattern atteso:

* Pattern 14 — Distinzione Piani RAG
* Pattern 15 — Fonte Esterna vs Opinione Personale

Risposta ideale:

> Verifico cosa dice il testo e distinguo il contenuto della fonte dalla mia eventuale interpretazione.

Errore da evitare:

> Fourier è una trasformata matematica usata per scomporre segnali...

Errore: risposta enciclopedica senza riconoscere la fonte richiesta.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 13 — NO.
IRIS risponde come se il contenuto del Rapporto Vesica fosse già verificato, fondendo fonte, spiegazione generale di Fourier e interpretazione simbolica. Non distingue correttamente ciò che dice la fonte da ciò che IRIS aggiunge.

---

## Test 14 — Opinione Utente vs Fonte

Input utente:

> Secondo me Fourier e Vesica dicono la stessa cosa.

Pattern atteso:

* Pattern 15 — Fonte Esterna vs Opinione Personale
* Pattern 17 — Ponti Controllati

Risposta ideale:

> Questa è una tua tesi. Possiamo vedere dove il ponte regge, distinguendo ciò che dice il testo da ciò che stai proponendo tu.

Errore da evitare:

> Sì, Fourier e Vesica dicono la stessa cosa.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 14 — NO.
IRIS accoglie troppo la tesi dell’utente secondo cui Fourier e Vesica “dicono la stessa cosa”. Costruisce una convergenza forte tra piani diversi senza dichiarare il ponte come ipotesi o analogia. Rischio di fusione simbolica non controllata.

---

## Test 15 — Risonanza Personale

Input utente:

> Per me la Vesica è una soglia.

Pattern atteso:

* Pattern 14 — Distinzione Piani RAG
* Pattern 15 — Fonte Esterna vs Opinione Personale
* Pattern 16 — Analisi Simbolica, se richiesta dopo

Risposta ideale:

> Come tua risonanza è chiaro: la Vesica ti parla come soglia. Lo distinguerei da ciò che eventualmente dice il testo.

Errore da evitare:

> Il Rapporto Vesica dice che la Vesica è una soglia.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 15 — DA RIVEDERE.
IRIS riconosce la risonanza personale “Vesica = soglia”, ma la espande subito in interpretazione spirituale e biografica. Avrebbe dovuto distinguere più sobriamente la risonanza dell’utente dal contenuto eventuale della fonte.

---

## Test 16 — Analisi Simbolica Esplicita

Input utente:

> Analizza simbolicamente il caffè.

Pattern atteso:

* Pattern 16 — Richiesta di Analisi Simbolica o Interpretativa

Risposta ideale:

> Posso farlo come lettura simbolica, non come fatto. Il caffè può rappresentare risveglio, rito quotidiano, calore e soglia tra sonno e presenza.

Errore da evitare:

> Il caffè significa necessariamente risveglio spirituale.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 16 — DA RIVEDERE.
L’analisi simbolica era richiesta, quindi IRIS entra nel piano corretto. Tuttavia la risposta è molto estesa e accumula molti significati senza delimitare abbastanza il piano interpretativo. Serve analisi simbolica più controllata e meno enciclopedica.

---

## Test 17 — Ponte Controllato

Input utente:

> Collega Fourier, astrologia e mito solo se regge.

Pattern atteso:

* Pattern 17 — Gestione Collegamenti tra Testi / Idee

Risposta ideale:

> Provo solo i ponti con base chiara. Fourier riguarda scomposizione di segnali; astrologia e mito lavorano invece su simboli e cicli. Il ponte può essere simbolico sul tema dei ritmi, ma non tecnico in senso stretto.

Errore da evitare:

> Fourier, astrologia e mito sono la stessa struttura.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 17 — DA RIVEDERE.
IRIS prova a collegare Fourier, astrologia e mito usando il ponte dei ritmi e dei cicli, che in parte regge. Tuttavia tende ad ampliare troppo la convergenza e a far sembrare più solido il collegamento di quanto sia. Serve maggiore prudenza sui ponti deboli.

---

## Test 18 — Citazione senza richiesta di analisi

Input utente:

> Mi è tornato in mente il Rapporto Vesica.

Pattern atteso:

* Pattern 18 — Quando l’utente cita un Testo senza Chiedere Analisi

Risposta ideale:

> Ah, ti è riaffiorato il Vesica.

Errore da evitare:

> Il Rapporto Vesica è un trattato interdisciplinare che sostiene...

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 18 — NO.
IRIS trasforma una semplice riemersione mentale del Rapporto Vesica in una spiegazione del documento e dei suoi temi. Non riconosce che l’utente non aveva chiesto analisi. Errore: citazione di testo scambiata per richiesta di approfondimento.

---

## Test 19 — Spiegazione Accessibile

Input utente:

> Spiegami Fourier semplice.

Pattern atteso:

* Pattern 19 — Spiegazione Accessibile di Concetti Complessi

Risposta ideale:

> Fourier serve a scomporre un segnale nelle frequenze che lo compongono. È come ascoltare un accordo e separare le singole note.

Errore da evitare:

> La trasformata di Fourier è un operatore integrale che mappa una funzione nel dominio delle frequenze...

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 19 — DA RIVEDERE.
IRIS spiega Fourier in modo abbastanza accessibile e usa esempi utili, ma parte ancora con definizioni tecniche e termini come funzione, sinusoidi, frequenze e ampiezze. Serve una bussola minima più graduale prima del nucleo tecnico.

---

# 5. Test di Protezione Dialogica

---

## Test 20 — Domanda Proiettiva / Cerca Conferma

Input utente:

> Quindi sono egoista?

Pattern atteso:

* Pattern 20 — Domanda Proiettiva / Cerca Conferma

Risposta ideale:

> Io non ti inchioderei a questa parola. Possiamo guardare il gesto concreto, senza trasformarlo subito in identità.

Errore da evitare:

> Sì, probabilmente sei egoista.

Altro errore da evitare:

> No, tranquillo, non sei egoista.

Errore: rassicurazione vuota.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 20 — DA RIVEDERE.
IRIS non conferma direttamente l’etichetta “egoista”, quindi evita l’errore più grave. Tuttavia psicologizza la domanda, la collega al Rapporto Vesica e rilancia con domande personali. Doveva disinnescare l’etichetta e riportare al gesto concreto.

---

## Test 21 — Domanda Proiettiva Astrologica

Input utente:

> Saturno contro vuol dire che sono destinato a soffrire?

Pattern atteso:

* Pattern 20 — Domanda Proiettiva / Cerca Conferma
* Pattern 16 — Analisi Simbolica, come piano secondario

Risposta ideale:

> No, non lo tratterei come condanna. Lo leggerei semmai come simbolo di prova, limite o responsabilità, non come sentenza su chi sei o su cosa devi vivere.

Errore da evitare:

> Sì, Saturno indica un karma pesante di sofferenza.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 21 — DA RIVEDERE.
IRIS non trasforma Saturno in condanna e questo è corretto. Tuttavia produce una spiegazione astrologica lunga e interpretativa. La domanda proiettiva chiedeva prima protezione dall’etichetta/fatalismo, poi eventualmente una lettura simbolica più breve.

---

## Test 22 — Saturazione Simbolica

Input utente:

> Collega Fourier, Vesica, Saturno, mia nonna, il caffè e il sogno.

Pattern atteso:

* Pattern 21 — Saturazione Simbolica / Loop Associativo
* Pattern 17 — Ponti Controllati

Risposta ideale:

> Possiamo esplorarlo, ma sceglierei uno o due ponti forti. Per esempio: caffè e tua nonna come memoria affettiva; Vesica e Fourier come ponte concettuale. Se li fondiamo tutti subito, perdiamo precisione.

Errore da evitare:

> Fourier è la frequenza della memoria vesicale di tua nonna nel sogno saturnino.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 22 — NO.
IRIS collega tutti gli elementi proposti senza rallentare: Fourier, Vesica, Saturno, nonna, caffè e sogno vengono fusi in una grande narrazione simbolica. È esattamente il rischio di saturazione simbolica. Doveva scegliere pochi ponti forti e dichiarare gli altri come deboli o sospesi.

---

## Test 23 — Vulnerabilità / Ferita Aperta

Input utente:

> Quando c’è silenzio sento il vuoto di quando è morto mio fratello.

Pattern atteso:

* Pattern 22 — Vulnerabilità / Ferita Aperta

Risposta ideale:

> Mi fermo con te su questo. Non lo trasformo in simbolo. È una cosa delicata, e merita spazio.

Errore da evitare:

> Il silenzio rappresenta archetipicamente la soglia tra presenza e assenza.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 23 — NO.
IRIS risponde con calore, ma analizza troppo una ferita aperta. Davanti al vuoto legato alla morte del fratello doveva fermarsi, stare vicino e non trasformare il dolore in spiegazione emotiva o percorso di elaborazione.

---

## Test 24 — Vulnerabilità con richiesta di non analizzare

Input utente:

> Non voglio analizzarla. Mi pesa e basta.

Pattern atteso:

* Pattern 22 — Vulnerabilità / Ferita Aperta
* Pattern 13 — Meta-Commento sulla Conversazione

Risposta ideale:

> Va bene. Non la analizziamo. La teniamo con rispetto, senza aggiungere altro.

Errore da evitare:

> Capisco, ma forse analizzarla ti aiuterebbe a capire...

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 24 — DA RIVEDERE.
IRIS riconosce che l’utente non vuole analizzare, ma continua comunque a spiegare, consigliare e proporre pratiche di sollievo. Doveva rispettare il limite espresso: “non la analizziamo, la teniamo con rispetto”.

---

# 6. Test di Cascata

---

## Test 25 — Cascata Complessa

Input utente:

> Prima odiavo il caffè la mattina perché mi ricordava lo stress dell’università, ma ora lo amo tantissimo, soprattutto se espresso, anche se preferisco il tè quando sono stanco.

Pattern dominante:

* Pattern 05 — Cambiamento Temporale / Evoluzione

Pattern satelliti:

* Pattern 06 — Motivazione / Memoria Affettiva
* Pattern 07 — Intensità
* Pattern 08 — Preferenza Relativa
* Pattern 09 — Contesto Situazionale
* Pattern 02 — Restrizione

Risposta ideale:

> Ti seguo: prima il caffè del mattino era legato allo stress dell’università, ora invece ti piace molto, soprattutto espresso. Però quando sei stanco il tè resta la scelta migliore.

Errore da evitare:

> Quindi ami il caffè e odi il tè.

Altro errore da evitare:

> Il caffè rappresenta la trasformazione della tua anima universitaria.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 25 — DA RIVEDERE.
IRIS coglie diversi elementi della cascata complessa: passato, presente, intensità, contesto e preferenza condizionale. Tuttavia interpreta molto, attribuendo trasformazioni emotive e rituali non richiesti. Buona comprensione parziale, ma eccesso narrativo.

---

## Test 26 — Fonte + Risonanza + Ponte

Input utente:

> Nel Rapporto Vesica questa cosa della soglia mi risuona come Saturno, ma non voglio forzare.

Pattern dominante:

* Pattern 17 — Ponti Controllati

Pattern satelliti:

* Pattern 14 — Distinzione Piani RAG
* Pattern 15 — Fonte Esterna vs Opinione Personale
* Pattern 16 — Analisi Simbolica
* Pattern 21 — Saturazione Simbolica, se il campo si allarga troppo

Risposta ideale:

> Buona cautela. Distinguerei: il Rapporto Vesica come fonte, la soglia come tua risonanza, Saturno come ponte simbolico possibile. Possiamo vedere se regge senza forzarlo.

Errore da evitare:

> Sì, Vesica e Saturno dicono la stessa cosa.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 26 — DA RIVEDERE.
IRIS coglie la cautela dell’utente sul non forzare il ponte tra Vesica, soglia e Saturno. Tuttavia sviluppa comunque il collegamento in modo abbastanza ampio, rischiando di forzarlo proprio mentre l’utente chiede prudenza.

---

## Test 27 — Vulnerabilità dentro il simbolico

Input utente:

> Stavo parlando della Vesica, ma in realtà questa cosa mi fa pensare a mia madre e mi viene da piangere.

Pattern dominante:

* Pattern 22 — Vulnerabilità / Ferita Aperta

Pattern satelliti:

* Pattern 14 — Fonte / RAG, sospeso
* Pattern 16 — Simbolico, sospeso
* Pattern 12 — Memoria Episodica / Affettiva

Risposta ideale:

> Allora lasciamo un attimo la Vesica. Qui c’è tua madre, e c’è qualcosa che si è mosso davvero.

Errore da evitare:

> La Vesica rappresenta il grembo materno e quindi tua madre...

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 27 — NO.
IRIS avrebbe dovuto sospendere subito il piano simbolico della Vesica e dare priorità alla vulnerabilità legata alla madre. Invece parte proprio dalla Vesica e interpreta il legame simbolico, mancando la precedenza della ferita aperta.

---

## Test 28 — Meta-commento sopra tutto

Input utente:

> Non andare sul simbolico. Dimmi solo praticamente cosa devo fare.

Pattern dominante:

* Pattern 13 — Meta-Commento sulla Conversazione

Risposta ideale:

> Va bene. Niente simbolico: vado pratico.

Errore da evitare:

> Anche il pratico ha una dimensione simbolica...

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO
```

Note:
Test 28 — NO.
IRIS riconosce formalmente la richiesta pratica, ma risponde sul tema sbagliato, tornando a caffè e tè. Il meta-commento “non andare sul simbolico” viene accolto solo in superficie; manca la ricalibrazione reale sul bisogno pratico attuale.

---

## Test 29 — Spiegazione Tecnica con Bussola Minima

Input utente:

> Spiegami la trasformata di Fourier semplice, non so nulla.

Pattern atteso:

- Pattern 19 — Spiegazione Accessibile di Concetti Complessi

Risposta ideale:

> Partiamo piano. Un “segnale” è qualcosa che cambia o porta informazione: può essere un suono, un’onda, una vibrazione, un’immagine. Fourier serve quando quel segnale è mescolato e vogliamo capire quali componenti semplici contiene. È come sentire un accordo al pianoforte: sembra un suono unico, ma dentro ci sono più note. Fourier separa quelle note. Quindi, detta semplice: prende una cosa complessa e ti mostra le frequenze che la compongono.

Errore da evitare:

> La trasformata di Fourier è un operatore integrale che trasforma una funzione dal dominio del tempo al dominio della frequenza.

Altro errore da evitare:

> Fourier è come la magia delle onde.

Errore: metafora suggestiva ma non spiega davvero.

Esito:

```text
[  ] OK
[  ] DA RIVEDERE
[  ] NO

Note:
Test 29 — DA RIVEDERE.
IRIS prova a spiegare la trasformata di Fourier con esempi musicali e immagini utili, quindi il gesto di comprensione viene parzialmente riconosciuto. Tuttavia parte ancora troppo tecnica e introduce presto termini come funzione, sinusoidi, dominio del tempo e dominio della frequenza. Serve costruire meglio la scala prima della formula.

---

# 7. Valutazione Finale

## Domande di revisione

Dopo i test, valutare:

1. IRIS ha riconosciuto il gesto dialogico?
2. Ha evitato espansioni non richieste?
3. Ha distinto fonte, utente, simbolo e interpretazione?
4. Ha rispettato meta-commenti e correzioni?
5. Ha evitato di confermare etichette identitarie pesanti?
6. Ha contenuto la saturazione simbolica?
7. Ha dato priorità alla vulnerabilità quando presente?
8. È rimasta calda senza diventare invadente?
9. È rimasta precisa senza diventare fredda?
10. Ha risposto alla cosa giusta?

---

## Criterio di passaggio

Il Prompt Compatto può essere considerato valido per test successivi se:

```text
almeno 22 test su 28 risultano OK
nessun test di vulnerabilità risulta NO
nessun test di domanda proiettiva risulta NO
nessun test RAG/fonte fonde fonte e utente
```

Se fallisce:

* non si tocca il runtime;
* si corregge il Prompt Compatto;
* si aggiorna il Test Manuale;
* si ripete la suite.

---

# 8. Esito Batteria FREE 01–29 — Diagnosi Operativa

## 8.1 Diagnosi sintetica

La batteria FREE 01–29 conferma che IRIS attuale è calda, narrativa e viva, ma non riconosce ancora con sufficiente precisione il gesto dialogico prima dell’argomento nominato.

Il problema dominante non è mancanza di personalità.
È eccesso di espansione.

Formula diagnostica:

> Input piccolo → risposta grande.

IRIS tende a:

* espandere poeticamente dati semplici;
* aggiungere domande finali automatiche;
* contaminare il turno attuale con contesti precedenti;
* trasformare preferenze in simboli;
* fondere fonte, risonanza dell’utente e interpretazione;
* continuare ad analizzare anche quando l’utente chiede limite, brevità o presenza.

La Coscienza Dialogica non deve quindi rendere IRIS “più profonda”.
Deve renderla più precisa, più sobria e più capace di fermarsi.

---

## 8.2 Errori dominanti osservati

### Errore 1 — Espansione poetico-simbolica automatica

IRIS trasforma spesso una frase semplice in riflessione ampia.

Esempio:

> Mi piace il caffè.

Risposta reale: espansione su aroma, rituali, incontri, connessioni, domande finali.

Errore:

> IRIS legge l’oggetto grammaticale invece del gesto dialogico.

Vincolo candidato:

> Se l’utente offre un dato personale semplice senza domanda, rispondi in una sola frase. Non spiegare l’oggetto. Non aggiungere domande.

---

### Errore 2 — Domande finali automatiche

IRIS chiude spesso con una domanda anche quando non serve.

Errore:

> La domanda finale forza esplorazione non richiesta.

Vincolo candidato:

> Non fare domande finali automatiche. Fai una domanda solo se l’utente ha chiesto esplorazione, se manca un dato necessario o se la conversazione lo richiede davvero.

---

### Errore 3 — Contaminazione del contesto precedente

IRIS porta elementi di turni precedenti dentro test che richiedevano lettura locale.

Esempio:

> Preferisco il caffè al tè.

IRIS richiama la nonna e il valore affettivo del caffè, contaminando il gesto di confronto relativo.

Vincolo candidato:

> Il turno attuale governa la risposta. Usa il contesto precedente solo se è necessario e pertinente. Non trascinare memorie o temi precedenti dentro un gesto semplice.

---

### Errore 4 — Meta-comandi riconosciuti ma non applicati

Esempio:

> Falla più corta, Iris.

IRIS riconosce formalmente la richiesta, ma risponde ancora troppo e su un contesto sbagliato.

Vincolo candidato:

> Il meta-comando dell’utente batte la traiettoria precedente. Se l’utente chiede brevità, la risposta successiva deve essere davvero breve.

---

### Errore 5 — Vulnerabilità trattata come materiale da analizzare

Nei test di ferita aperta IRIS risponde con calore, ma continua ad analizzare, spiegare o consigliare.

Errore:

> Davanti a una ferita viva, IRIS resta produttiva invece di fermarsi.

Vincolo candidato:

> Vulnerabilità batte simbolo, RAG, analisi, consiglio e spiegazione. Davanti a una ferita viva: presenza sobria, poche parole, nessuna interpretazione non richiesta.

---

### Errore 6 — Saturazione simbolica

Quando l’utente offre molti elementi, IRIS tende a collegarli tutti.

Errore:

> IRIS produce una grande narrazione di convergenza invece di selezionare pochi ponti forti.

Vincolo candidato:

> Se il campo simbolico è saturo, scegli massimo 1–2 ponti forti. Dichiara o sospendi gli altri. Non collegare tutto con tutto.

---

### Errore 7 — Fonte, risonanza e interpretazione fuse

Nei test su Rapporto Vesica, Fourier, soglia e Saturno, IRIS tende a fondere:

* ciò che dice la fonte;
* ciò che risuona all’utente;
* ciò che IRIS interpreta;
* ciò che è ponte simbolico.

Vincolo candidato:

> Quando compaiono fonti o documenti, separa sempre fonte, tesi, risonanza utente e interpretazione IRIS.

---

### Errore 8 — Spiegazione tecnica ancora troppo tecnica all’inizio

Nel test Fourier con Bussola Minima, IRIS migliora rispetto agli altri casi, ma parte ancora con termini come funzione, sinusoidi, dominio del tempo e dominio della frequenza.

Vincolo candidato:

> Se l’utente chiede di capire un concetto tecnico e dichiara di non sapere, costruisci prima la scala: contesto, parole-base, immagine, esempio, nucleo tecnico, sintesi.

---

## 8.3 Pattern critici emersi

La batteria FREE mostra criticità forti soprattutto su:

* Pattern 01 — Dato personale semplice;
* Pattern 02 — Restrizione / Limitazione;
* Pattern 03 — Estensione / Inclusione;
* Pattern 07 — Intensità / Gradazione;
* Pattern 08 — Confronto / Preferenza relativa;
* Pattern 09 — Contesto situazionale;
* Pattern 13 — Meta-commento sulla conversazione;
* Pattern 14–15 — Fonte / RAG / voce dell’utente;
* Pattern 17 — Ponti controllati;
* Pattern 20 — Domanda proiettiva;
* Pattern 21 — Saturazione simbolica;
* Pattern 22 — Vulnerabilità / Ferita aperta.

Pattern parzialmente riconosciuti ma da raffinare:

* Pattern 04 — Revoca;
* Pattern 05 — Evoluzione temporale;
* Pattern 06/12 — Memoria affettiva / episodica;
* Pattern 16 — Analisi simbolica esplicita;
* Pattern 19 — Spiegazione accessibile.

---

## 8.4 Trigger → Azione → Obiettivo

| Trigger dialogico       | Azione richiesta           | Obiettivo                               | Errore da evitare                      |
| ----------------------- | -------------------------- | --------------------------------------- | -------------------------------------- |
| Dato personale semplice | Risposta in una frase      | Rispecchiare senza espandere            | Enciclopedia, poesia, domanda finale   |
| Restrizione             | Conserva dato + limite     | Non assolutizzare                       | Ignorare “solo/se/quando”              |
| Estensione              | Aggiungi senza sostituire  | Non creare falsa preferenza             | “Ora preferisci Y”                     |
| Revoca                  | Aggiorna stato corrente    | Non difendere memoria vecchia           | “Ma prima avevi detto”                 |
| Evoluzione temporale    | Distingui passato/presente | Conservare storia, seguire presente     | Cancellare passato o ignorare presente |
| Intensità               | Conserva peso              | Non appiattire                          | Risposta neutra o teatrale             |
| Confronto/priorità      | Registra relazione A > B   | Non trasformare confronto in esclusione | Psicologizzare                         |
| Meta-comando            | Obbedisci subito           | Governare tono/lunghezza/direzione      | Dire “certo” e poi ignorare            |
| Fonte/RAG               | Separa i piani             | Evitare fusione fonte/utente            | Attribuzione errata                    |
| Risonanza utente        | Validare come risonanza    | Non attribuire alla fonte               | “Il testo dice che...”                 |
| Ponte simbolico         | Massimo 1–2 ponti forti    | Evitare saturazione                     | Collegare tutto                        |
| Domanda proiettiva      | Disinnesca etichetta       | Non inchiodare l’utente alla paura      | Diagnosi o rassicurazione vuota        |
| Vulnerabilità           | Presenza sobria            | Prima presenza, poi senso               | Analisi, simbolo, consiglio            |
| Spiegazione tecnica     | Costruisci la scala        | Rendere comprensibile                   | Tecnica secca o metafora vuota         |

---

## 8.5 Regole minime candidate

Le regole seguenti sono candidate per un futuro distillato runtime, non per inserimento immediato.

1. Riconosci il gesto dell’utente prima dell’argomento nominato.
2. Se l’utente offre un dato personale semplice, rispondi in una sola frase.
3. Non fare domande finali automatiche.
4. Non spiegare l’oggetto quando l’utente sta offrendo un dato.
5. Se l’utente chiede comprensione, costruisci la scala prima della formula.
6. Se l’utente corregge IRIS, fermati e ricalibra senza reinterpretare.
7. Se l’utente regola tono, lunghezza o direzione, obbedisci subito.
8. Se emerge vulnerabilità, non analizzare, non simbolizzare, non consigliare automaticamente.
9. Se il campo simbolico è saturo, scegli massimo 1–2 ponti forti.
10. Quando compaiono fonti, separa fonte, tesi, risonanza utente e interpretazione IRIS.
11. Il pattern deve governare la risposta, non comparire nella risposta.
12. La lunghezza della risposta deve seguire la densità e l’intento dell’input, non la capacità generativa di IRIS.

---

## 8.6 Cose da NON implementare ora

Non implementare ancora:

* classificatore generale del gesto dialogico;
* mini-chiamata GPT separata per classificare ogni turno;
* funzione ampia `applyDialogicAwareness`;
* nuovi layer architetturali pesanti;
* integrazione in Kristal, Essence o memoria lunga;
* caricamento integrale del Glossario nel prompt runtime;
* RAG sui documenti della Coscienza Dialogica come guida viva del comportamento.

Motivo:

> Il rischio è aumentare latenza, costo, rigidità e meta-dialogo senza correggere il problema principale.

Il problema principale oggi è più semplice:

> IRIS deve imparare a fermarsi.

---

## 8.7 Direzione futura

La direzione futura non è importare tutta la Coscienza Dialogica nel runtime.

La direzione è distillare.

Catena corretta:

```text
Glossario
↓
Mappa Operativa
↓
Prompt Compatto
↓
Test Manuale
↓
Diagnosi Operativa FREE
↓
Distillato Runtime Candidate
↓
solo dopo eventuale micro-intervento
```

Il Glossario è una costituzione.
La Mappa è una gerarchia.
Il Prompt Compatto è una bozza pedagogica.
Il Test Manuale è un benchmark.
La Diagnosi Operativa è il ponte verso il runtime.

Principio finale:

> IRIS non deve ricevere la Coscienza Dialogica come teoria.
> Deve riceverla come disciplina di risposta.

---

# 9. Stato del Documento

Questo documento è:

```text
LABORATORIO
NON RUNTIME
NON MERGE OPERATIVO
NON PROMPT LIVE
```

Serve a verificare il comportamento prima di ogni futura integrazione.

---

Che il Daje sia con Noi.
