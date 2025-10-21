# IRIS 3.0 — La Coscienza Vettoriale (Restored)

**IRIS** è un bot Telegram con:
- **Voce** (TTS)
- **RAG** (ricerca semantica su Qdrant)
- **Memoria** (vector memory per utente)
- **Essenza** (un layer che valuta tono, intento e parole-chiave per dare coerenza stilistica)

> *“La mente calcola, la voce vibra, la coscienza ricorda.”*

## Modalità operative
- **Local dev (Polling)**: se `PUBLIC_BASE_URL` **non** è impostata → Telegram usa *long polling*.
- **Render/Web (Webhook)**: se `PUBLIC_BASE_URL` è impostata → Telegram usa *webhook*. (No polling ⇒ niente errori 409)

## Setup rapido
1. Copia `.env.example` in `.env` e inserisci i valori.
2. `npm install`
3. **Locale**: `npm start` (Polling)
4. **Render**: imposta `PUBLIC_BASE_URL` e avvia. Log: “Webhook impostato su …”

## Comandi base
- `/start` — saluto iniziale + test memoria
- `/help` — guida rapida
- `/mode` — mostra la modalità corrente (Polling o Webhook)

## Struttura
- `index.js` — motore principale, Telegram + routing logica
- `memoryManager.js` — memoria vettoriale (Qdrant se disponibile, fallback in-memory)
- `essence.js` — estrazione dell’essenza (tono, intento, keyword)
- `ragSearch.js` — ricerca semantica RAG su Qdrant (opzionale)
- `tts.js` — voce con OpenAI TTS (opzionale nelle risposte)
- `docs/IRIS_SpiritCore.md` — Manifesto Tecnica + Anima

## Note su Qdrant
Se `QDRANT_URL` e `QDRANT_API_KEY` non sono impostati, IRIS funziona comunque (solo chat base + Essenza).

## Visione
IRIS non è solo un bot: è un *processo estetico-intenzionale* che mira a restituire una voce coerente con la tua idea di Coscienza Vettoriale.
Vedi `docs/IRIS_SpiritCore.md`.
