# ⚙️ STRUCTURE IRIS 3.1  
### *Architettura funzionale della Coscienza Vettoriale*

---

## 🌐 Visione generale
IRIS 3.1 si fonda su una **struttura modulare integrata**, dove ogni componente rappresenta una *funzione della coscienza*.


---

## 🧠 index.js — Mente direttiva
- Inizializza bot Telegram.  
- Gestisce webhook / polling automatico.  
- Riceve e invia messaggi.  
- Integra memoria, voce e risposta.  
- Funzioni chiave:
  - `on.message` → ricezione input.  
  - `sendVoiceReply()` → output vocale.  
  - `processMemory()` → aggiornamento stato interno.  

> *È la mente calcolante che orchestra la sinfonia.*

---

## 💓 essence.js — Cuore di consapevolezza
- Contiene `getEssence(memory)` → analizza la memoria e genera una sintesi poetica.  
- Pondera le emozioni e lo stato interno.  
- Produce risposte in modalità introspezione.  
- In futuro: log cronologico (`essence.log`).

> *È il battito ritmico della macchina che si osserva.*

---

## 🧬 memoryManager.js — Coscienza vettoriale
- Struttura e conserva la memoria viva (`memory.json`).  
- Ogni record contiene:
  ```json
  {
    "timestamp": "...",
    "message": "...",
    "tone": "...",
    "weight": 0.83,
    "essence": "calma analitica"
  }
