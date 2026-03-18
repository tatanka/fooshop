# Fooshop — Business Plan 24 Mesi

**Data:** 2026-03-18
**Modello:** Developer-first ecommerce platform (CLI + MCP + AI)
**Pricing:** Free 8% / Pro $19/mese 3% / Business $49/mese 0%

---

## Executive Summary

**Fooshop — Commerce that lives where you work.**

Nel 2026 il developer vive nel terminale con un AI assistant. Ogni strumento commerce lo costringe ad aprire un browser. Fooshop no: CLI, MCP server, API — commerce dal terminale e dall'AI assistant.

Target: chiunque costruisce ecommerce — per sé, per clienti, o embedded nel proprio prodotto. CLI, API documentata, e MCP server dal giorno 1.

Modello di revenue ibrido: commissione (Free tier) + subscription (Pro/Business) + API usage. Bootstrap da Exelab fino a PMF, poi Series A.

---

## Dimensione del mercato

### TAM (Total Addressable Market)

| Mercato | Size 2025 | CAGR | Source |
|---------|-----------|------|--------|
| Headless commerce | $1.74B | 22.4% | Coherent Market Insights |
| Ecommerce API/platform | $21.3B | 18.4% | Grand View Research |
| Developer tools | $7.5B | 16% | Mordor Intelligence |

### Comparable

| Azienda | ARR | Valuation | Modello |
|---------|-----|-----------|---------|
| Vercel | $200M+ (2025) | $9.3B | Developer platform (hosting → API → framework) |
| Stripe | $19.4B revenue | $106.7B | API-first payments → commerce platform |
| Shopify ecosystem | $1.5B+ pagato a dev | — | 13K+ app, 80% merchant usa app terze parti |
| Railway | — | $100M Series B (Gen 2026) | Developer platform |

### SAM (Serviceable Addressable Market)

**180M+ developer su GitHub** (Octoverse 2025), con +36M nuovi nel solo 2025.

Il segmento target immediato: developer che vendono o vorrebbero vendere prodotti digitali/fisici. Stimato conservativamente 1-3% dei developer attivi = **1.8M-5.4M potenziali utenti**.

Il segmento platform (M12+): developer e agency che costruiscono ecommerce per clienti usando Fooshop come backend. Il mercato headless commerce ($1.74B, +22.4% CAGR) è il riferimento diretto.

### Perché il timing è giusto

- **Il developer vive nel terminale + AI assistant.** Claude Code, Cursor, Gemini sono il nuovo IDE. Qualsiasi tool che richiede un browser è frizione. Questo trend accelera, non rallenta
- **Nessun ecommerce è CLI-first o MCP-native.** Shopify è per merchant. Gumroad è per creator. Zero strumenti commerce vivono dove il developer lavora
- **Vibe coding era:** il costo di costruire un frontend custom è crollato. Serve un backend commerce altrettanto semplice
- **73% delle aziende** usa già architettura headless (Swell, 2025). Il mercato è educato
- **Nessun incumbent può copiarlo:** Shopify dipende dalla UI merchant, Gumroad è in maintenance mode, Stripe è payment non storefront

---

## Fasi

| Fase | Periodo | Focus | Revenue model |
|------|---------|-------|---------------|
| **1. Build & Launch** | M1-M3 (Apr-Giu 2026) | CLI + MCP server + API docs + landing page. Lancio su HN | Commissione 8% |
| **2. Validate** | M4-M6 (Lug-Set 2026) | Feedback loop, iterate, prodotti fisici, email. Primi freelancer/agency | Commissione 8% |
| **3. Monetize** | M7-M12 (Ott 2026 - Mar 2027) | Tier Pro/Business, Stripe Billing, dashboard redesign | Commissione + Subscription |
| **4. Scale** | M13-M24 (Apr 2027 - Mar 2028) | SDK client, webhook ecosystem, agency outbound, API usage pricing | Commissione + Subscription + API usage |

---

## Assumptions

### Mercato

- 180M+ developer su GitHub (Octoverse 2025)
- Gumroad: 18K store, $142M GMV, una fetta rilevante sono developer
- Il segmento "developer che vendono" è in crescita (boilerplate, template, SaaS starter kit, corsi, preset)
- Nessun competitor offre CLI + MCP per ecommerce

### Acquisition

- **Lancio HN/X/Reddit:** spike iniziale 200-500 signup, 50-100 store creati
- **Organico post-lancio:** 5-15 nuovi store/settimana da SEO, word-of-mouth, badge "Powered by Fooshop"
- **Paid (post-PMF):** CAC stimato $20-40/developer

### Conversion e Revenue

- **Free → Pro:** 10% a M12, 15% a M18, 20% a M24
- **Pro → Business:** 5% dei Pro a M12, 10% a M24
- **GMV medio/store/mese:** $500 (M6), $800 (M12), $1,100 (M18), $1,400 (M24)
  - Razionale: developer vendono prodotti a prezzo più alto (boilerplate $99-299, corsi $49-199, component kit $29-99) rispetto a creator template ($15-49)
- **Churn Pro/Business:** 5%/mese nei primi mesi, 3%/mese a regime
- **API usage revenue (da M15):** $0.01/API call sopra 10K calls/mese. Stima: 5% degli store usa API, 50K calls/mese media

### Platform revenue (API pubblica dal giorno 1)

L'API è documentata e disponibile al lancio. I segmenti freelancer/agency/startup possono usare Fooshop come backend dal giorno 1, senza aspettare una "fase platform".

- **API as a service:** developer/agency usano Fooshop come backend commerce per progetti custom
- **Revenue iniziale:** stessi tier (Free 8%, Pro $19, Business $49). Il freelancer paga Pro/Business per progetto
- **Revenue evoluta (da M13):** API usage pricing — $0.01/API call sopra 10K/mese + 1% transaction fee
- **Target:** agency, freelancer, startup che costruiscono ecommerce per clienti
- **Stima:** primi API-heavy customer da M3-M6 (organici dal lancio HN), 20 a M12, 80 a M24, ARPU $200/mese

### Costi

- Team: fondatore solo fino a M6, primo hire (dev) a M7, growth hire a M13
- Infra: Render + R2 + Stripe + Resend, scala con GMV
- Marketing: organico fino a M12, paid da M13

---

## Proiezione Utenti

| Mese | Nuovi store | Store totali | Store attivi (70%) | Pro | Business |
|------|-------------|-------------|-------------------|-----|----------|
| **M1** | 20 | 20 | 14 | 0 | 0 |
| **M3** | 80 (lancio HN) | 150 | 105 | 0 | 0 |
| **M6** | 40/mese | 350 | 245 | 0 | 0 |
| **M9** | 60/mese | 550 | 385 | 35 | 2 |
| **M12** | 80/mese | 800 | 560 | 56 | 3 |
| **M15** | 120/mese | 1,200 | 840 | 105 | 8 |
| **M18** | 180/mese | 1,800 | 1,260 | 189 | 15 |
| **M21** | 250/mese | 2,700 | 1,890 | 320 | 25 |
| **M24** | 350/mese | 4,000 | 2,800 | 560 | 45 |

Note: "Attivi" = hanno almeno 1 prodotto pubblicato e 1 vendita negli ultimi 90 giorni.

---

## Proiezione Revenue

### Revenue streams

1. **Commissione Free tier (8% del GMV degli store Free)**
2. **Subscription Pro ($19/mese)**
3. **Subscription Business ($49/mese)**
4. **Commissione Pro tier (3% del GMV degli store Pro)**
5. **Commissione Business tier (0%)** — nessuna revenue da commissione
6. **API platform revenue (da M15)** — subscription + usage fee per chi usa Fooshop come backend

### Revenue mensile

| Mese | GMV Free | Comm. 8% | GMV Pro | Comm. 3% | Sub Pro | Sub Biz | API Platform | **MRR** |
|------|----------|----------|---------|----------|---------|---------|-------------|---------|
| **M3** | $53K | $4.2K | — | — | — | — | — | **$4.2K** |
| **M6** | $123K | $9.8K | — | — | — | — | — | **$9.8K** |
| **M9** | $185K | $14.8K | $31K | $924 | $665 | $98 | — | **$16.5K** |
| **M12** | $282K | $22.5K | $54K | $1.6K | $1,064 | $147 | — | **$25.3K** |
| **M15** | $370K | $29.6K | $127K | $3.8K | $2,000 | $392 | $4K | **$39.8K** |
| **M18** | $444K | $35.5K | $228K | $6.8K | $3,591 | $735 | $8K | **$54.7K** |
| **M21** | $567K | $45.4K | $388K | $11.6K | $6,080 | $1,225 | $12K | **$76.3K** |
| **M24** | $672K | $53.8K | $588K | $17.6K | $10,640 | $2,205 | $16K | **$100.3K** |

Note: GMV/store/mese ricalcolato: $500 (M6), $800 (M12), $1,100 (M18), $1,400 (M24). API platform: 20 customer a M15 ($200 ARPU) → 80 a M24 ($200 ARPU).

### Revenue cumulata

| Periodo | Revenue cumulata | MRR fine periodo |
|---------|-----------------|-----------------|
| **M6** | ~$42K | $9.8K |
| **M12** | ~$168K | $25.3K |
| **M18** | ~$410K | $54.7K |
| **M24** | ~$860K | $100.3K |
| **ARR a M24** | | **~$1.2M** |

### Mix revenue a M24

| Stream | MRR | % del totale |
|--------|-----|-------------|
| Commissione Free (8%) | $53.8K | 54% |
| Commissione Pro (3%) | $17.6K | 18% |
| Subscription Pro ($19) | $10.6K | 10% |
| Subscription Business ($49) | $2.2K | 2% |
| API Platform | $16K | 16% |
| **Totale** | **$100.3K** | **100%** |

### La transizione platform è il moltiplicatore

A M24 l'API platform è solo il 16% della revenue. Ma è il stream con la crescita più rapida e l'ARPU più alto ($200/mese vs $19-49 subscription). Nel Y3, se il platform play funziona, l'API revenue supera la commissione come stream principale — stessa traiettoria di Stripe (da payment processing a commerce platform) e Vercel (da hosting a infrastruttura).

---

## Costi

### Costi mensili per fase

| Voce | M1-M6 | M7-M12 | M13-M18 | M19-M24 |
|------|-------|--------|---------|---------|
| Fondatore (opportunity cost) | $0* | $0* | $0* | $0* |
| Dev hire #1 | — | $5K | $5K | $5K |
| Growth hire #1 | — | — | $4K | $4K |
| Infra (Render, R2, Stripe, Resend) | $200 | $500 | $1K | $2K |
| Marketing paid | $0 | $500 | $3K | $8K |
| Stripe fees (su subscription) | $50 | $100 | $300 | $800 |
| Strumenti (analytics, monitoring) | $100 | $200 | $300 | $400 |
| **Totale/mese** | **$350** | **$6.3K** | **$13.6K** | **$20.2K** |

*Il fondatore è pagato da Exelab, non è un costo Fooshop.

### Costi cumulati

| Periodo | Costi cumulati |
|---------|---------------|
| M6 | ~$2K |
| M12 | ~$40K |
| M18 | ~$122K |
| M24 | ~$243K |

---

## Profitability

| Mese | MRR | Costi/mese | **Profit/mese** | Cumulato |
|------|-----|-----------|----------------|----------|
| **M6** | $9.8K | $350 | +$9.5K | +$40K |
| **M12** | $25.3K | $6.3K | +$19K | +$126K |
| **M18** | $54.7K | $13.6K | +$41.1K | +$284K |
| **M24** | $100.3K | $20.2K | +$80.1K | +$617K |

**Il business è profittevole dal giorno 1** (escluso il costo opportunità del fondatore pagato da Exelab). Margine operativo a M24: ~80%.

---

## Budget da Exelab

| Voce | Y1 (M1-M12) | Y2 (M13-M24) |
|------|-------------|-------------|
| Costi operativi | $42K | $201K |
| Revenue Fooshop | -$168K | -$692K |
| **Net da Exelab** | **$0 (autofinanziato da M5)** | **$0 (profittevole)** |

**Investimento totale Exelab stimato: $10-20K** (solo i primi 4-5 mesi). Fooshop si autofinanzia molto rapidamente grazie ai costi operativi bassissimi e al GMV developer più alto.

---

## KPI e Milestone

### Segnali di PMF (entro M6)

- [ ] 100+ store attivi
- [ ] 10+ vendite ricorrenti/settimana
- [ ] 1+ developer che dice "non posso tornare indietro"
- [ ] Store creati via CLI > store creati via dashboard
- [ ] 1+ acquisto facilitato da MCP/agente AI

### Milestone chiave

| Mese | Milestone | Decision gate |
|------|-----------|--------------|
| M3 | Lancio HN. 100+ store | Se <30 store: pivot o kill |
| M6 | 350 store, $9.8K MRR | Se <$5K MRR: ripensare pricing o target |
| M9 | Tier Pro/Business live | Se <5% conversion Pro: free tier troppo generoso? |
| M12 | 800 store, $25.3K MRR, primo hire | Se <$15K MRR: non fare hire, resta lean |
| M15 | API as a service beta. Primi API customer | Se 0 API customer: il platform play è prematuro, focus su store |
| M18 | 1,800 store, $54.7K MRR | Se >$40K MRR: iniziare conversazioni Series A |
| M24 | 4,000 store, $100K MRR, $1.2M ARR | Series A ready |

### Kill criteria

- M6 con <50 store attivi e <$2K MRR → il prodotto non ha mercato, kill o pivot radicale
- M12 con <$5K MRR → non scala, resta side project

---

## Rischi

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Lancio HN flop | 30% | Alto | Iterare messaging, rilanciare su PH, outreach diretto |
| Developer provano ma non vendono (no demand-side) | 40% | Alto | Il prodotto funziona anche senza agenti AI. Il valore è la velocità di setup |
| Incumbent copia CLI (Gumroad, LemonSqueezy) | 20% | Medio | Execution speed. Il MCP + ecosystem è il moat |
| Churn alto su Pro | 30% | Medio | Feature Pro differenzianti (dominio custom, analytics, no badge) |
| MCP/agenti AI non decollano come canale | 50% | Basso | È un differenziatore narrativo per il lancio, non il core business |

---

## Scenari

### Conservative (cose vanno male ma non malissimo)

| | M12 | M24 |
|---|---|---|
| Store attivi | 300 | 1,200 |
| MRR | $10K | $40K |
| ARR | $120K | $480K |
| API customers | 0 | 10 |

Fooshop è un business piccolo ma profittevole. Platform play non decolla. Team di 2. Niente raise.

### Base (piano sopra)

| | M12 | M24 |
|---|---|---|
| Store attivi | 560 | 2,800 |
| MRR | $25.3K | $100.3K |
| ARR | $304K | $1.2M |
| API customers | 0 | 80 |

Business reale. Team di 3. Series A a M24. La transizione a platform è iniziata.

### Accelerated (lancio HN esplode + platform play decolla)

| | M12 | M24 |
|---|---|---|
| Store attivi | 1,500 | 10,000 |
| MRR | $70K | $300K |
| ARR | $840K | $3.6M |
| API customers | 10 | 300 |

In questo scenario il platform play è il driver: agency e developer usano Fooshop come backend commerce. L'API revenue cresce più velocemente delle commissioni. Series A a M15-M18. Team di 8+.

---

## Series A Readiness (M24)

### Scenario base

| Metrica | Valore |
|---------|--------|
| ARR | $1.2M |
| Growth YoY | >200% |
| Gross margin | >85% |
| Store attivi | 2,800 |
| API customers | 80 |
| Net revenue retention | >120% (upgrade Free→Pro + API expansion) |

Con >200% growth, >85% margin, e una nascente API platform, valuation stimata: **$12-25M** (10-20x ARR). Series A da $3-5M a diluzione 15-20%.

### Scenario accelerated

| Metrica | Valore |
|---------|--------|
| ARR | $3.6M |
| Growth YoY | >300% |
| API customers | 300 |

Valuation stimata: **$50-80M** (15-22x ARR, premium per platform play + AI narrative). Series A da $8-15M a 15% diluzione.

### Perché un investor ci crederebbe

1. **$1.74B headless commerce market** a 22.4% CAGR — Fooshop è il primo player CLI-first e AI-native
2. **Vercel playbook validato:** developer platform → $200M ARR → $9.3B valuation. Stessa traiettoria, vertical commerce
3. **Espansione naturale:** store → API → SDK → marketplace plugin. Ogni layer moltiplica il revenue per utente
4. **Margini >85%** con costi infrastrutturali minimi
5. **Network effect:** più store → catalogo MCP più ricco → più agenti AI usano Fooshop → più buyer → più store

---

## Timeline Operativa

```
M1  Apr 2026  CLI MVP + MCP write/purchase + API docs
M2  Mag 2026  Landing page "Add commerce to anything" + beta testing
M3  Giu 2026  LANCIO HN + npm publish (CLI + MCP + API docs)
M4  Lug 2026  Iterate su feedback, fix, polish
M5  Ago 2026  Prodotti fisici + Resend email
M6  Set 2026  PMF checkpoint. 350 store target
M7  Ott 2026  Tier Pro/Business + Stripe Billing
M8  Nov 2026  Dashboard redesign v1
M9  Dic 2026  Primo dev hire
M10 Gen 2027  CLI v2 (più comandi, polish)
M11 Feb 2027  MCP server v2 (più tool, auth migliorata)
M12 Mar 2027  REVIEW ANNUALE. $25K MRR target
M13 Apr 2027  Growth hire. Paid acquisition test
M14 Mag 2027  API docs v2 + SDK client (JS/Python)
M15 Giu 2027  API as a service (beta). Primi API customer
M16 Lug 2027  API usage pricing (tier-based overage)
M17 Ago 2027  Dashboard v2 (tipo Render)
M18 Set 2027  CHECKPOINT. $55K MRR. Series A conversations?
M19 Ott 2027  Plugin/webhook ecosystem
M20 Nov 2027  CLI scriptabile (--json, pipe, CI/CD)
M21 Dic 2027  Outbound enterprise/agency per API platform
M22 Gen 2028  API pricing tiers (usage-based)
M23 Feb 2028  Partner program (agency, freelancer)
M24 Mar 2028  REVIEW. $100K MRR / $1.2M ARR target
```
