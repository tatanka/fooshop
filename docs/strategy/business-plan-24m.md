# Fooshop — Business Plan 24 Mesi

**Data:** 2026-03-18
**Modello:** Developer-first ecommerce platform (CLI + MCP + AI)
**Pricing:** Free 8% / Pro $19/mese 3% / Business $49/mese 0%

---

## Executive Summary

Fooshop è una piattaforma ecommerce per developer. `fooshop init` deploya uno store live in 30 secondi. CLI-first, AI-native, MCP-enabled. Il primo ecommerce dove agenti AI possono cercare e comprare prodotti.

Modello di revenue ibrido: commissione (Free tier) + subscription (Pro/Business). Bootstrap da Exelab fino a PMF, poi Series A.

---

## Fasi

| Fase | Periodo | Focus |
|------|---------|-------|
| **1. Build & Launch** | M1-M3 (Apr-Giu 2026) | CLI + MCP server + landing page. Lancio su HN |
| **2. Validate** | M4-M6 (Lug-Set 2026) | Feedback loop, iterate, prodotti fisici, email |
| **3. Monetize** | M7-M12 (Ott 2026 - Mar 2027) | Tier Pro/Business, Stripe Billing, dashboard redesign |
| **4. Scale** | M13-M24 (Apr 2027 - Mar 2028) | Paid acquisition, hiring, API as a service |

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
- **GMV medio/store/mese:** $300 (M6), $500 (M12), $700 (M18), $900 (M24)
- **Churn Pro/Business:** 5%/mese nei primi mesi, 3%/mese a regime

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

### Revenue mensile

| Mese | GMV Free | Comm. 8% | GMV Pro | Comm. 3% | Sub Pro | Sub Biz | **MRR** |
|------|----------|----------|---------|----------|---------|---------|---------|
| **M3** | $31K | $2.5K | — | — | — | — | **$2.5K** |
| **M6** | $74K | $5.9K | — | — | — | — | **$5.9K** |
| **M9** | $105K | $8.4K | $18K | $525 | $665 | $98 | **$9.7K** |
| **M12** | $151K | $12.1K | $28K | $840 | $1,064 | $147 | **$14.1K** |
| **M15** | $184K | $14.7K | $74K | $2.2K | $2,000 | $392 | **$19.3K** |
| **M18** | $215K | $17.2K | $132K | $4.0K | $3,591 | $735 | **$25.5K** |
| **M21** | $275K | $22.0K | $224K | $6.7K | $6,080 | $1,225 | **$36.0K** |
| **M24** | $336K | $26.9K | $392K | $11.8K | $10,640 | $2,205 | **$51.5K** |

### Revenue cumulata

| Periodo | Revenue cumulata | MRR fine periodo |
|---------|-----------------|-----------------|
| **M6** | ~$25K | $5.9K |
| **M12** | ~$85K | $14.1K |
| **M18** | ~$210K | $25.5K |
| **M24** | ~$430K | $51.5K |
| **ARR a M24** | | **~$618K** |

### Mix revenue a M24

| Stream | MRR | % del totale |
|--------|-----|-------------|
| Commissione Free (8%) | $26.9K | 52% |
| Commissione Pro (3%) | $11.8K | 23% |
| Subscription Pro ($19) | $10.6K | 21% |
| Subscription Business ($49) | $2.2K | 4% |
| **Totale** | **$51.5K** | **100%** |

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
| **M6** | $5.9K | $350 | +$5.6K | +$23K |
| **M12** | $14.1K | $6.3K | +$7.8K | +$45K |
| **M18** | $25.5K | $13.6K | +$11.9K | +$88K |
| **M24** | $51.5K | $20.2K | +$31.3K | +$187K |

**Il business è profittevole dal giorno 1** (escluso il costo opportunità del fondatore pagato da Exelab). Questo è un vantaggio enorme del bootstrap: nessuna pressione da burn rate.

---

## Budget da Exelab

| Voce | Y1 (M1-M12) | Y2 (M13-M24) |
|------|-------------|-------------|
| Costi operativi | $42K | $201K |
| Revenue Fooshop | -$85K | -$345K |
| **Net da Exelab** | **$0 (autofinanziato da M8)** | **$0 (profittevole)** |

Con il modello developer-first, i costi pre-hire sono bassissimi (~$350/mese). Il revenue da commissione copre i costi infrastrutturali quasi subito. L'hire a M7 è il primo vero costo, ma a quel punto l'MRR è ~$10K.

**Investimento totale Exelab stimato: $15-30K** (solo i primi 6-8 mesi prima che Fooshop si autofinanzi). Molto meno del $435-725K stimato nel piano precedente, perché il modello developer-first ha costi operativi molto più bassi e non richiede paid acquisition pre-PMF.

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
| M6 | 350 store, $5.9K MRR | Se <$3K MRR: ripensare pricing o target |
| M9 | Tier Pro/Business live | Se <5% conversion Pro: free tier troppo generoso? |
| M12 | 800 store, $14.1K MRR, primo hire | Se <$10K MRR: non fare hire, resta lean |
| M18 | 1,800 store, $25.5K MRR | Se >$20K MRR: iniziare conversazioni Series A |
| M24 | 4,000 store, $51.5K MRR, $618K ARR | Series A ready se growth >100% YoY |

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
| MRR | $6K | $22K |
| ARR | $72K | $264K |

Fooshop resta un side project profittevole. Non giustifica hiring ma genera revenue.

### Base (piano sopra)

| | M12 | M24 |
|---|---|---|
| Store attivi | 560 | 2,800 |
| MRR | $14.1K | $51.5K |
| ARR | $169K | $618K |

Business reale. Team di 2-3. Series A possibile a M24.

### Optimistic (lancio HN esplode, word-of-mouth forte)

| | M12 | M24 |
|---|---|---|
| Store attivi | 1,500 | 8,000 |
| MRR | $40K | $150K |
| ARR | $480K | $1.8M |

Series A a M18. Team di 5+. Inizio espansione API as a service.

---

## Series A Readiness (M24)

### Scenario base

| Metrica | Valore |
|---------|--------|
| ARR | $618K |
| Growth YoY | >200% |
| Gross margin | >85% |
| Store attivi | 2,800 |
| Net revenue retention | >110% (upgrade Free→Pro) |

Con >200% growth e >85% margin, valuation stimata: **$6-12M** (10-20x ARR). Sufficiente per un seed/pre-Series A da $2-3M a diluzione accettabile (15-20%).

### Scenario optimistic

| Metrica | Valore |
|---------|--------|
| ARR | $1.8M |
| Growth YoY | >300% |

Valuation stimata: **$25-40M**. Series A da $5-8M a 15% diluzione.

---

## Timeline Operativa

```
M1  Apr 2026  CLI MVP + MCP write/purchase
M2  Mag 2026  Landing page developer + beta testing
M3  Giu 2026  LANCIO HN + npm publish
M4  Lug 2026  Iterate su feedback, fix, polish
M5  Ago 2026  Prodotti fisici + Resend email
M6  Set 2026  PMF checkpoint. 350 store target
M7  Ott 2026  Tier Pro/Business + Stripe Billing
M8  Nov 2026  Dashboard redesign v1
M9  Dic 2026  Primo dev hire
M10 Gen 2027  CLI v2 (più comandi, polish)
M11 Feb 2027  MCP server v2 (più tool, auth migliorata)
M12 Mar 2027  REVIEW ANNUALE. $14K MRR target
M13 Apr 2027  Growth hire
M14 Mag 2027  Paid acquisition test
M15 Giu 2027  API documentation pubblica
M16 Lug 2027  API as a service (beta)
M17 Ago 2027  SDK client (JS/Python)
M18 Set 2027  CHECKPOINT. $25K MRR. Series A conversations?
M19 Ott 2027  Espansione canali paid
M20 Nov 2027  Dashboard v2 (tipo Render)
M21 Dic 2027  Plugin/webhook ecosystem
M22 Gen 2028  CLI scriptabile (--json, pipe, CI/CD)
M23 Feb 2028  Outbound enterprise/agency
M24 Mar 2028  REVIEW. $51K MRR / $618K ARR target
```
