# DR-2026-03-11: Strategia di difendibilita' — il moat non e' nel codice

**Contesto:** Fooshop e' tecnicamente replicabile in 2-3 settimane. Serve chiarezza su cosa rende il progetto difendibile e dove investire per costruire vantaggi cumulativi.

**Decisione:** La difendibilita' si costruisce su 3 layer complementari, in ordine di priorita': (1) execution speed, (2) distribuzione AI/MCP, (3) community moat. Il codice non e' mai il moat.

**Opzioni considerate:**

| Strategia | Difendibilita' | Effort |
|-----------|---------------|--------|
| A. Execution speed — iterare veloce con feedback di creator reali | Alta nei primi 12 mesi, vantaggio cumulativo | Alto (tempo fondatore) |
| B. Distribuzione AI/MCP — primo marketplace indicizzato da agenti AI | Alta e unica, differenziale strutturale | Medio (infrastruttura gia' pronta) |
| C. Community moat — creator come alleati, non utenti | Molto alta a lungo termine | Medio-basso |

**Razionale:**

Il chicken-and-egg problem dei marketplace e' la vera barriera, non il codice. Un clone deve:
- Convincere creator a migrare (da dove?)
- Costruire SEO da zero
- Costruire distribuzione AI da zero
- Undercut-tare il 5% (a quel punto lavora gratis)
- Fare tutto questo senza feedback reali

Il rischio competitivo reale non e' il clone piccolo — e' che Gumroad abbassi le fee. Ma Gumroad e' in maintenance mode dal 2024, non ha AI store generation ne' canale MCP.

## Layer di difesa nel tempo

| Layer | Oggi | 6 mesi | 18 mesi |
|-------|------|--------|---------|
| Supply lock-in (creator con link, SEO, audience) | Zero | Medio | Alto — costo migrazione reale |
| Demand aggregation (buyer tornano) | Zero | Basso | Medio — explore, MCP, SEO long-tail |
| Data moat (cosa vende, pricing intelligence) | Zero | Basso | Medio-alto — nessun clone parte con questi dati |
| Distribuzione MCP/AI | Infrastruttura pronta | Primi agenti AI usano il catalogo | Canale unico |
| Brand nella nicchia | Zero | "Quello al 5% con AI" | Community riconosciuta |
| Codice/tech | Replicabile | Replicabile | Replicabile |

## Implicazioni operative

- Ogni giorno speso a costruire feature invece di mettere creator sulla piattaforma e' un giorno regalato ai competitor
- MCP server su npm va pubblicato subito dopo il seeding (gia' in roadmap Fase 3)
- I primi 50 creator vanno trattati come alleati (community), non come utenti
- Non inseguire feature parity con Gumroad — differenziarsi su AI e distribuzione

**Impatto:** Nessun aggiornamento a doc esistenti. Questo DR serve come bussola per le decisioni di prioritizzazione futura: se un'attivita' non rafforza uno dei 3 layer, probabilmente non e' prioritaria.
