# DR-2026-03-11: Proiezione revenue 5 anni — da marketplace a commerce layer

**Contesto:** Servono proiezioni revenue a 5 anni per guidare le decisioni su funding, hiring e priorita' di sviluppo. I numeri sono ancorati ai dati di mercato dei DR precedenti (Gumroad $142M GMV, 18K store, mercato digital products $416B by 2030).

**Decisione:** Scenario "Il Sogno" come stella polare, con espansione verticale dal Y3. I numeri sono calcolati con media annuale (ramp-adjusted), non con run-rate di fine anno.

## Metodologia

- GMV annuale = (GMV_mensile_inizio_anno + GMV_mensile_fine_anno) / 2 × 12
- Revenue Pro tier = subscriber_medi_anno × $49/mese × 12 (blended ARPU con tier Pro/Business/Enterprise)
- Adoption rate Pro: 15% Y2 → 22% Y3 → 22% Y4 → 25% Y5
- Plugin marketplace revenue = 20% del GMV plugin
- Tutti i numeri sono scenario ottimistico ("Il Sogno"), non scenario base

## Mix verticale nel tempo

| | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---|---|---|---|---|
| Digital products | 100% | 80% | 55% | 35% | 25% |
| Subscription/membership | — | 20% | 20% | 15% | 12% |
| Coaching/servizi | — | — | 12% | 15% | 15% |
| Print-on-demand | — | — | 8% | 12% | 13% |
| Merch fisico | — | — | — | 13% | 18% |
| Micro-SaaS/tool | — | — | 5% | 10% | 17% |

## Proiezione revenue — "Il Sogno" (corretto)

| | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---|---|---|---|---|
| **Fase** | Digital puro | + Subscriptions | + Servizi, POD | + Fisico, SaaS | Commerce layer |
| Creator (fine anno) | 1,200 | 4,000 | 14,000 | 35,000 | 80,000 |
| GMV/creator/mese (blended) | $900 | $1,300 | $1,800 | $2,400 | $3,000 |
| GMV mensile (fine anno) | $1.1M | $5.2M | $25.2M | $84M | $240M |
| **GMV annuale (ramp-adjusted)** | **~$7M** | **~$38M** | **~$182M** | **~$655M** | **~$1.9B** |
| | | | | | |
| Revenue commissione (5%) | $350K | $1.9M | $9.1M | $32.7M | $97M |
| Revenue Pro tier ($49/mo blended) | — | $175K | $920K | $3M | $8.1M |
| Revenue plugin marketplace (20%) | — | — | $500K | $3.5M | $10M |
| Revenue API/infra | — | — | $150K | $1.5M | $5M |
| | | | | | |
| **Revenue totale** | **$350K** | **$2.1M** | **$10.7M** | **$40.7M** | **$120.1M** |
| **MRR fine anno** | **$54K** | **$290K** | **$1.5M** | **$5.2M** | **$14.8M** |

## Valuation implicita

| | Y3 | Y5 |
|---|---|---|
| Revenue | $10.7M | $120.1M |
| Growth rate YoY | ~400% | ~195% |
| Multiplo (high-growth SaaS/marketplace) | 20x | 18x |
| **Valuation** | **~$215M** | **~$2.2B** |

## Milestone chiave

| Momento | Revenue | Significato |
|---------|---------|-------------|
| M12 | $54K MRR | "Funziona" — PMF signal |
| M18 | ~$150K MRR | Business reale, prime assunzioni |
| M24 | $290K MRR / $2.1M anno | Series A territory |
| M36 | $1.5M MRR / $10.7M anno | $200M+ valuation, scaling |
| M60 | $14.8M MRR / $120M anno | Unicorn |

## Condizioni necessarie

| Condizione | Probabilita' | Se fallisce |
|-----------|-------------|-------------|
| PMF entro M6 (100 creator attivi, vendite ricorrenti) | 40-50% | Si resta un side project |
| Pro tier con >15% conversion | 60% se PMF | Revenue resta solo commission-based |
| Plugin ecosystem decolla | 30-40% | Crescita lineare, non esponenziale |
| Vertical expansion funziona | 50% se plugin ok | Si resta marketplace digital-only (comunque buono) |
| Nessun incumbent reagisce aggressivamente | 70% | Gumroad e' morto, Shopify guarda altrove |

Scenario piu' probabile se le cose vanno bene ma non perfettamente: Y3 a $3-5M revenue, $50-80M valuation. Comunque un business serio.

## Relazione con altri DR

- DR-2026-03-11-long-term-vision: sequenza marketplace → platform → commerce layer
- DR-2026-03-11-funding-and-marketing: $435-725K da Exelab per arrivare al PMF
- DR-2026-03-11-defensibility: i 3 layer di difesa che rendono possibile la crescita
- DR-2026-03-08-launch-strategy: il piano operativo per i primi 6 mesi
- DR-2026-03-08-multi-platform-revenue-analysis: i dati di mercato alla base delle stime
