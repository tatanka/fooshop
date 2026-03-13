# DR-2026-03-08: Strategia di lancio — Creator Seeding + Community Launch

**Contesto:** Fooshop ha un MVP funzionante (onboarding, dashboard, checkout, store pubblici, explore). Serve una strategia di go-to-market per raggiungere l'obiettivo di validazione: 50 creator, 10 vendite, 1 vendita da MCP/AI.

**Decisione:** Lancio in 4 fasi sequenziali: (0) Alpha testing con tester fidati, (1) Creator Seeding via outreach diretto, (2) Community Launch su Product Hunt/X/Reddit, (3) Growth loops organici.

**Opzioni considerate:**

| Opzione | Pro | Contro |
|---------|-----|--------|
| A. Creator Seeding bottom-up (scelta, fase 1) | Creator reali = marketplace credibile, feedback diretto | Lento (1-1 outreach), tasso conversione ~5-10% |
| B. Community Launch PH + social (scelta, fase 2) | Alto volume awareness, social proof | Spike senza retention se non c'e' sostanza |
| C. Influencer Bait (scartata da sola) | Controllo qualita' iniziale | Non costruisce network effect, sembra side project |

**Razionale:** Un marketplace vuoto non converte. Servono 20-30 store reali prima di qualsiasi lancio pubblico. La sequenza seeding → launch risolve il chicken-and-egg problem.

## Piano operativo

### Fase 0 — Alpha Testing (Settimana 0)

**Obiettivo:** Validare i flussi core (onboarding, upload, checkout, store pubblico) con un gruppo ristretto di 5-10 tester fidati prima dell'outreach pubblico.

**Gruppo 1 — Smoke test tecnico (2-3 persone dalla rete personale)**
- Amici tech-savvy o colleghi che conoscono la creator economy
- Scopo: verificare che tutto funzioni end-to-end (il checkout completa? l'upload va? lo store si genera?)
- Feedback su UX e bug bloccanti

**Gruppo 2 — Alpha creator (5-10 creator reali via outreach mirato)**
- Sourcing su X/Twitter: cercare `"selling on gumroad" template` o `"notion template" "link in bio"`
- Sourcing su Reddit: r/Notion, r/FigmaDesign, r/videography — chi posta il proprio Gumroad link
- Sourcing su IndieHackers: post "Building a Gumroad alternative — looking for 10 creators to break it"
- DM personale: *"Ho visto [prodotto]. Sto costruendo un'alternativa a Gumroad al 5% con store generati da AI. Cerco 10 creator per testare prima del lancio — feedback onesto in cambio di 0% commissione per 6 mesi"*
- Volume: 10 DM mirati. Target: 5 che accettano

**Perche' creator reali e non solo amici:**
- Chi vende su Gumroad ogni giorno da feedback qualificato, non di cortesia
- Non rubano l'idea (hanno il loro prodotto, non le skill per clonare un marketplace)
- Se soddisfatti, diventano i primi store reali e evangelisti naturali

**Operativamente:**
- Creare gruppo Telegram/Discord privato con i tester
- Task strutturato: "Crea uno store, carica un prodotto, simula un acquisto. Cosa ti ha bloccato?"
- Raccogliere feedback per 5-7 giorni, fixare bug critici, poi passare a Fase 1

### Fase 1 — Creator Seeding (Settimana 1-2)

**Tecnica: "Gumroad Arbitrage"**
- Target: creator con 1K-10K follower che vendono template/preset su Gumroad nella fascia $20-$49
- Proposta: "Vendi su Gumroad al 10%. Su Fooshop paghi 5% e il tuo store viene generato da AI in 30 secondi"
- Incentivo: **0% commissione per i primi 3 mesi** ai primi 50 creator (costo reale: zero)
- Volume: 20 DM/giorno x 10 giorni = 200 contatti. Target: 20 creator convertiti

**Canali di sourcing:**
- Twitter: `"selling on gumroad" template` / `"notion template" "link in bio"`
- TikTok: creator che mostrano earnings Gumroad
- Reddit: r/notion, r/Figma, r/lightroom — chi linka il proprio Gumroad

### Fase 2 — Community Launch (Settimana 3)

**Prerequisito:** 20-30 store con prodotti reali.

- Product Hunt launch con screenshot di store reali (non mockup)
- Post su X: calcolatore interattivo "quanto risparmi vs Gumroad"
- Post su Reddit: r/SideProject, r/EntrepreneurRideAlong, r/digital_marketing
- Pagina `/compare` con calcolatore di risparmio ($2,000/mese su Gumroad = $2,400/anno in commissioni extra)

### Fase 3 — Growth Loops (Ongoing)

| Loop | Meccanismo | Costo |
|------|-----------|-------|
| Powered by Fooshop | Badge su ogni store pubblico con CTA "Sell your digital products free" | Zero (codice) |
| MCP come canale earned | Pubblicare mcp-server su npm, indicizzazione da agenti AI | Zero |
| Referral nativo | Creator invita creator → 0% commissione per 30gg per entrambi | Zero |
| SEO long-tail | Ogni store/prodotto = landing page indicizzata per query specifiche | Zero (gia' predisposto con sitemap.ts) |

## Cosa NON fare

- Non spendere in ads prima di product-market fit
- Non costruire feature nuove prima del lancio — il prodotto e' sufficiente
- Non targettare course creator (cfr. DR-2026-03-08-target-creator-segment)
- Non lanciare su PH senza store reali

## Impatto su codebase

| Cosa | Azione | Priorita' |
|------|--------|-----------|
| Pagina `/compare` | Creare calcolatore Gumroad vs Fooshop | Alta (pre-launch) |
| Badge "Powered by Fooshop" | Aggiungere a `[slug]/page.tsx` | Alta (pre-launch) |
| Programma 0% primi 50 creator | Override commissione in `lib/stripe.ts` | Media (per seeding) |
| Referral tracking | Campo `referred_by` su tabella `creators` | Bassa (fase 3) |
| MCP server su npm | Pubblicare `mcp-server/` come pacchetto pubblico | Media (fase 3) |

## Timeline

| Settimana | Milestone | KPI |
|-----------|-----------|-----|
| 0 | Alpha testing: smoke test + 5-10 creator fidati | Flussi validati, bug critici fixati |
| 1-2 | Seeding: outreach a 200 creator | 20 creator registrati |
| 3 | Community launch (PH + social + /compare) | 30 creator aggiuntivi, prime vendite |
| 4-6 | Growth loops attivi | 50+ creator, 10+ vendite |
| 6+ | Iterazione su feedback, ottimizzazione conversione | 1+ vendita da MCP |
