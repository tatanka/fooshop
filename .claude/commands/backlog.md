Gestisci il backlog del progetto (`BACKLOG.md`).

Se $ARGUMENTS è vuoto, mostra lo stato attuale. Altrimenti interpreta la richiesta.

---

## Principi

### 1. Outcome, non implementazione
Ogni item descrive un **risultato** per l'utente, non un task tecnico.
- NO: "Aggiungere endpoint per export CSV"
- SÌ: "Export CSV contratti dalla dashboard"
- NO: "Refactoring del servizio email"
- SÌ: solo se produce un beneficio misurabile — altrimenti non è backlog, è debito tecnico interno
- Formato lungo (opzionale): "Come [ruolo], voglio [azione], così da [beneficio]"

### 2. Essenzialità
- Prima di aggiungere: **"Serve davvero? Risolve un problema reale oggi?"**
- Se la risposta è "potrebbe servire in futuro" → non aggiungerlo
- Preferire item completabili in 1-2 sessioni (S o M)
- Item L/XL → chiedi all'utente se ha senso spezzarli prima di aggiungerli
- Se un item è nel backlog da >4 settimane senza essere iniziato, probabilmente non serve

### 3. No duplicati, no ambiguità
- Prima di aggiungere, verifica che non esista già un item simile
- Ogni item deve essere distinguibile dagli altri senza dover leggere la spec
- Se due item sono strettamente collegati, valuta se unirli

---

## Operazioni

### Mostra stato (nessun argomento)
1. Leggi `BACKLOG.md`
2. Mostra riepilogo conciso:
   - Item in corso (se presenti)
   - Conteggio per priorità (P0/P1/P2/P3)
   - I primi 3 item suggeriti come prossimi da affrontare (basati su priorità e complessità)
3. Segnala eventuali problemi: item stagnanti, priorità da rivedere, item vaghi

### Aggiungi item
1. **Verifica duplicati** — cerca item simili nel backlog attuale e completato
2. **Determina categoria:** STORE (storefront), PROD (prodotti), PAY (pagamenti), AI (intelligenza artificiale), MCP (mcp server), AUTH (autenticazione), DASH (dashboard), UI (interfaccia), BUG (bug fix), INFRA (infrastruttura), SEO (seo/marketing), API (api pubblica)
3. **Calcola prossimo ID** — es. se ultimo UI è UI-03, usa UI-04
4. **Valuta complessità** (S/M/L/XL) — se L o XL, chiedi all'utente se spezzare
5. **Chiedi priorità** all'utente se non specificata (default: P2)
6. **Scrivi descrizione** orientata all'outcome — riformula se l'utente ha dato un task tecnico
7. **Aggiungi riga** nella sezione priorità corretta con data odierna
8. **Aggiorna** "Ultimo aggiornamento" in cima al file
9. Se complessità >= L, suggerisci di creare una spec

### Crea spec
Crea `docs/specs/ID.md` quando:
- Complessità >= L
- Ci sono decisioni architetturali da prendere
- L'utente lo chiede esplicitamente

Struttura spec (adattare in base alla complessità — non tutte le sezioni sono obbligatorie):

```markdown
# ID: Titolo

**ID:** CAT-XX
**Priorità:** PX
**Complessità:** X
**Stato:** Da fare
**Data creazione:** YYYY-MM-DD

---

## 1. Stato Attuale
Cosa esiste oggi, cosa funziona, cosa manca.

## 2. Obiettivo
Outcome desiderato e criteri di accettazione.

## 3. Architettura / Schema DB (se applicabile)
Decisioni tecniche chiave.

## 4. API / Interfaccia (se applicabile)
Endpoint, payload, response.

## 5. File da Modificare
Lista dei file coinvolti, raggruppati per area.

## 6. Fasi di Implementazione
Step con checkbox, effort stimato per fase.

## 7. Test Plan
Cosa testare e come.
```

### Organizza il backlog
1. Leggi tutto `BACKLOG.md`
2. Identifica e segnala:
   - Item duplicati o sovrapponibili → suggerisci merge
   - Item vaghi senza outcome chiaro → suggerisci riformulazione
   - Item stagnanti (>4 settimane in P2/P3 senza movimento) → suggerisci rimozione o ripriorizzazione
   - Priorità incoerenti (un item P3 che blocca un P1)
   - Item completati ancora nella sezione attiva
3. Proponi le modifiche all'utente — non modificare senza conferma

### Sposta item
- **→ In Corso:** sposta dalla sezione priorità a "In Corso" con data inizio
- **→ Completato:** sposta a "Completato" con data, elimina spec file in `docs/specs/` se esiste
- Aggiorna "Ultimo aggiornamento" in cima al file e il placeholder "Nessun task" se la sezione diventa vuota

### Rimuovi item
- Chiedi sempre conferma prima di rimuovere
- Se l'item ha una spec in `docs/specs/`, elimina anche quella

---

## Formato tabelle (da rispettare)

**In Corso:**
`| ID | Descrizione | P | C | Inizio |`

**P0-P3:**
`| ID | Descrizione | C | Inserito |`

**Completato:**
`| ID | Descrizione | Completato |`

Se una sezione diventa vuota, inserisci la riga placeholder:
`| - | Nessun task [descrizione] | - | - |`

---

## Note backlog
Se un item ha contesto aggiuntivo (decisioni prese, link a documenti, funzionalità implementate), aggiungi una sezione in fondo a `BACKLOG.md` sotto `## Dettaglio Fasi` con formato:

```markdown
### ID - Titolo breve
Descrizione del contesto, decisioni, link a documenti.
```

Le note per item completati servono come documentazione storica — mantienile.
