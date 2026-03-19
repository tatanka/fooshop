# DR-2026-03-11: Strategia di difendibilita' (aggiornato 2026-03-18)

**Contesto:** Fooshop e' tecnicamente replicabile in 2-3 settimane. Serve chiarezza su cosa rende il progetto difendibile e dove investire per costruire vantaggi cumulativi.

**Decisione:** La difendibilita' si costruisce su 3 layer complementari, in ordine di priorita': (1) execution speed, (2) distribuzione AI/MCP, (3) developer ecosystem moat. Il codice non e' mai il moat.

**Aggiornato:** Adattato al pivot developer platform (da marketplace creator a "Add commerce to anything").

**Opzioni considerate:**

| Strategia | Difendibilita' | Effort |
|-----------|---------------|--------|
| A. Execution speed — iterare veloce con feedback di developer reali | Alta nei primi 12 mesi, vantaggio cumulativo | Alto (tempo fondatore) |
| B. Distribuzione AI/MCP — prima piattaforma ecommerce con MCP server | Alta e unica, differenziale strutturale | Medio (infrastruttura gia' pronta) |
| C. Developer ecosystem moat — CLI adoption, API integration, community | Molto alta a lungo termine | Medio |

**Razionale:**

Un clone deve:
- Costruire CLI + API + MCP server da zero
- Convincere developer a migrare (hanno gia' integrato Fooshop API nei loro progetti)
- Costruire distribuzione AI da zero
- Replicare la DX (developer experience) che migliora ogni settimana
- Fare tutto questo senza feedback reali

Il rischio competitivo reale non e' il clone piccolo — e' che Shopify lanci un prodotto CLI-first o che Stripe aggiunga un commerce layer. Ma Shopify e' ottimizzato per merchant (non developer) e Stripe vende infrastruttura di pagamento (non storefront).

## Layer di difesa nel tempo

| Layer | Oggi | 6 mesi | 18 mesi |
|-------|------|--------|---------|
| Developer lock-in (API integrata in progetti, CLI in workflow) | Zero | Medio | Alto — costo migrazione reale |
| Demand aggregation (buyer via MCP/AI) | Zero | Basso | Medio — agenti AI usano il catalogo |
| Data moat (catalogo, pricing intelligence) | Zero | Basso | Medio-alto |
| Distribuzione MCP/AI | Infrastruttura pronta | Primi agenti usano il catalogo | Canale unico |
| Brand nella nicchia developer | Zero | "Quello con la CLI" | "Il Vercel dell'ecommerce" |
| Codice/tech | Replicabile | Replicabile | Replicabile |

## Implicazioni operative

- Ogni giorno speso a costruire feature invece di mettere developer sulla piattaforma e' un giorno regalato ai competitor
- MCP server su npm va pubblicato al lancio (non dopo)
- CLI e API devono essere impeccabili — la DX e' il prodotto
- I primi 50 developer vanno trattati come co-fondatori, non come utenti
- Non inseguire feature parity con Shopify — differenziarsi su semplicita', AI e programmabilita'

**Impatto:** Questo DR serve come bussola per le decisioni di prioritizzazione: se un'attivita' non rafforza uno dei 3 layer, probabilmente non e' prioritaria.
