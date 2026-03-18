# DR-2026-03-11: Bootstrap da Exelab + strategia marketing (aggiornato 2026-03-18)

**Contesto:** Fooshop ha bisogno di capital per arrivare al PMF. Exelab genera $2.5M EBITDA nel 2026 (stima $3.5M nel 2027). Serve decidere se raccogliere funding esterno o bootstrappare, e come fare marketing.

**Decisione:** Bootstrap da cash flow Exelab fino al PMF. Marketing developer-community-first, paid solo post-PMF come accelerante. Raise Series A solo dopo PMF confermato.

**Aggiornato:** Budget rivisto al ribasso ($10-20K vs $435-725K), canali marketing adattati al target developer.

## Perche' bootstrap

| | Raise seed ora | Bootstrap + Series A al PMF |
|---|---|---|
| Valuation | $3-5M | $12-80M (a seconda dello scenario) |
| Dilution | 20-25% | 10-15% |
| Distrazione founder | 3-6 mesi fundraising | Zero |
| Pressione esterna | Board, reporting, growth-at-all-costs | Nessuna |

Con il modello developer-first, i costi pre-hire sono bassissimi (~$350/mese). Fooshop si autofinanzia dal M5.

## Budget operativo Y1-Y2

| Voce | Y1 (2026) | Y2 (2027) |
|------|-----------|-----------|
| Team (dev hire da M7+, growth hire da M13+) | $30K | $108K |
| Infrastruttura (Render, R2, Stripe, Resend) | $4K | $18K |
| Marketing | $3K | $66K |
| Strumenti + Stripe fees | $3K | $9K |
| **Totale** | **~$40K** | **~$201K** |
| **Revenue Fooshop** | **~$168K** | **~$692K** |
| **Net da Exelab** | **$0 (da M5)** | **$0** |

**Investimento totale Exelab: $10-20K** (solo i primi 4-5 mesi prima che Fooshop si autofinanzi).

## Strategia marketing: developer community-first

### Perche' non serve marketing paid pre-PMF

Pre-PMF non si conoscono: il messaggio che converte, il canale che funziona, il CAC, il LTV, ne' se il prodotto retiene. Pagare ads pre-PMF e' versare acqua in un secchio bucato.

### Il motore reale: developer word-of-mouth

Un developer tool virale si diffonde tramite:
- npm install (ogni `npx fooshop` e' marketing)
- Show HN post (community da 500K+ developer attivi)
- Tweet/post "Look what I built in 30 seconds"
- Badge "Powered by Fooshop" su ogni store gratuito
- Passaparola tecnico ("che stack usi per l'ecommerce?")

### Canali per fase

| Fase | Periodo | Budget/mese | Canali |
|------|---------|-------------|--------|
| Pre-PMF | M1-M12 | $0-500 | HN Show HN, npm publish, build in public su X, r/webdev, r/nextjs, SEO |
| Post-PMF | M13-M18 | $3-8K | Google Ads ("headless ecommerce", "ecommerce API"), sponsorship newsletter developer, retargeting |
| Scaling | M19-M24 | $8-15K | Raddoppio budget su canali con CAC provato, conference sponsorship |
| Growth | M25+ | 15% revenue | Multi-canale ottimizzato, autofinanziato |

### Canali organici a costo zero (motore primario)

| Canale | Meccanismo | Quando |
|--------|-----------|--------|
| npm / CLI | Ogni `fooshop init` e' un touchpoint. README su npm e' una landing page | Day 1 |
| Hacker News | Show HN: prima piattaforma ecommerce CLI-first | Lancio M3 |
| SEO long-tail | Ogni store/prodotto = landing page indicizzata | Day 1 |
| MCP / AI discovery | Buyer arrivano via agenti AI. Canale unico | Day 1 |
| Badge "Powered by Fooshop" | CTA su ogni store Free | Day 1 |
| Build in public | Fondatore racconta il viaggio su X | Day 1 |
| API docs / tutorial | Developer trova Fooshop cercando "ecommerce API" o "headless commerce simple" | M3+ |

### Canali paid post-PMF (accelerante)

| Canale | CAC stimato | Note |
|--------|------------|------|
| Google Ads (intent keywords) | $20-40/developer | "headless ecommerce API", "ecommerce for developers" |
| Newsletter sponsorship | $10-25/developer | Bytes, TLDR, JavaScript Weekly, Dev.to |
| X/Twitter ads | $25-45/developer | Target developer con keyword "ecommerce", "side project" |
| Conference sponsorship | Variabile | Next.js Conf, React Summit — brand awareness |

## Trigger per fundraising

| Evento | Azione |
|--------|--------|
| $1.2M+ ARR, crescita >200% YoY | Aprire conversazioni Series A |
| Competitor raccoglie $5M+ sullo stesso mercato | Valutare speed round |
| API platform esplode, serve scalare team subito | Bridge round veloce |
| Exelab ha un anno difficile | Seed round, solo se numeri Fooshop lo giustificano |

## Principio guida

Il marketing per Fooshop non e' un problema di budget — e' un problema di developer experience. Se la CLI e' bella, il prodotto si vende da solo. Il paid marketing arriva dopo come accelerante su canali con CAC/LTV provato.

**Impatto:** Questo DR si legge insieme a:
- DR-2026-03-11-defensibility-strategy.md (come difendersi)
- Pivot spec (dove arrivare)
- Business plan 24m (i numeri)
