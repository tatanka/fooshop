# DR-2026-03-11: Visione a lungo termine — da marketplace a commerce layer AI-native

**Contesto:** Fooshop nasce come marketplace per prodotti digitali al 5%. La visione del fondatore e' evolvere verso una piattaforma di commerce infrastrutturale, leggera, aperta, AI-native, con ecosistema plugin/SDK, capace di competere con Shopify in verticali specifici.

**Decisione:** La stella polare e' "commerce layer AI-native", ma l'esecuzione segue una sequenza rigida marketplace-first. Non si costruisce il layer successivo finche' quello attuale non regge da solo.

## La visione

Posizionamento: piattaforma infrastrutturale in linea con l'era del vibe coding. "Te lo potresti fare da solo, ma per pochi punti hai tutto: infrastruttura, AI, community, distribuzione MCP, librerie."

Evoluzione:
1. Marketplace prodotti digitali (5% commission, AI store generation, MCP)
2. API pubblica + ecosystem (webhook, integrazioni, add-on)
3. SDK plugin + community di developer/partner che costruiscono su Fooshop
4. Espansione in verticali e-commerce non-digital
5. Commerce layer AI-native competitivo con Shopify in verticali specifici

## Perche' funziona

- **Timing:** il vibe coding abbassa il costo di costruire storefront custom. Fooshop vende tempo, non software
- **Moat reale:** l'ecosistema plugin/SDK e' il layer che nessuno clona (stesso moat di Shopify: 8,000+ app)
- **Sequenza classica:** partire stretto ed espandere da posizione di forza (Shopify 2006: t-shirt snowboard → 2026: commerce globale)
- **AI-native come differenziale strutturale:** store generation, MCP distribution, AI-powered discovery — nessun incumbent ha questo nel DNA

## Rischi e vincoli

| Rischio | Mitigazione |
|---------|-------------|
| Over-engineering oggi per la piattaforma di domani | Regola: non costruire il layer N+1 finche' il layer N non regge |
| "No lock-in" e "headless" sono anti-moat per definizione | Il moat e' nei layer sopra: community, distribuzione AI, plugin ecosystem |
| Pensare ai verticali e-commerce prima del PMF | I verticali si esplorano solo dopo 1,000+ creator attivi |
| SDK plugin senza creator e' un progetto open source vuoto | L'SDK parte solo quando i creator chiedono API e customizzazione |

## Sequenza di esecuzione

| Fase | Prerequisito | Cosa si costruisce | Segnale di passaggio |
|------|-------------|-------------------|---------------------|
| 1. Marketplace puro | — | 5% commission, AI store gen, MCP server, UX onboarding | 100+ creator attivi, vendite ricorrenti |
| 2. API + ecosystem | PMF confermato | API pubblica, webhook, integrazioni base (Zapier, email, analytics) | Creator chiedono integrazioni, $20K+/mese revenue |
| 3. SDK + plugin marketplace | Ecosystem attivo | SDK developer, marketplace add-on, community partner | Developer esterni costruiscono su Fooshop |
| 4. Verticali non-digital | Platform play funzionante | Espansione a fisico, servizi, verticali specifici | Plugin ecosystem autosufficiente |

## Principio guida

**"Sii un marketplace che diventa piattaforma, non una piattaforma che cerca un marketplace."**

Ogni ora spesa sul platform play prima del PMF e' un'ora non spesa a mettere creator sulla piattaforma. Il platform play viene naturalmente quando i creator chiedono API, webhook, customizzazione.

## Revenue gate

Dal revenue analysis (DR-2026-03-08), scenario base:
- Y1 cumulata: $140K
- M12: $21K/mese

A $21K/mese si puo' finanziare lo sviluppo SDK. Prima di quel punto, focus esclusivo su marketplace e acquisizione creator.

**Impatto:** Questo DR e' la bussola strategica a lungo termine. Le decisioni di prioritizzazione quotidiane vanno misurate contro la fase corrente (oggi: Fase 1), non contro la visione finale.
