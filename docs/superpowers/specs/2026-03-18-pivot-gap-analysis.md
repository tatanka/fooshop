# Gap Analysis: Stato Attuale → Lancio Developer Platform

**Data:** 2026-03-18
**Timeline:** 3 settimane
**Ref:** `2026-03-18-fooshop-pivot-developer-platform-design.md`

---

## Cosa esiste e riusi

| Componente | Stato |
|-----------|-------|
| Stripe Connect checkout | Funziona (ricalcolare fee 8% vs 5%) |
| Auth (next-auth + Google) | Funziona |
| Upload file su R2 + download con token | Funziona |
| AI store generation (Claude API) | Funziona |
| Schema DB (creators, products, orders, pageViews, apiKeys) | Funziona |
| Dashboard web | Funziona (resta così al lancio) |
| Coupon system | Funziona |
| Referral system | Funziona |
| Analytics API | Funziona |
| Admin routes + API key auth | Funziona (base da estendere) |
| Sentry error tracking | Funziona |
| MCP server read tools (search, get_product, get_store) | Funziona |
| MCP `get_checkout_url` | Funziona (rename → `purchase_product`) |

---

## Cosa va modificato (piccolo effort)

| Cosa | Effort | Dettaglio |
|------|--------|-----------|
| `DEFAULT_COMMISSION_PERCENT` 5% → 8% | 5 min | Una riga in `lib/commission.ts` |
| API key scopes creator | 1-2 ore | Aggiungere: `store:read`, `store:write`, `products:read`, `products:write`, `orders:read` |
| API routes: accettare API key + session | 4-6 ore | Wrapper auth che accetta entrambi su products, store, orders, upload |
| Landing page copy | 1-2 giorni | Riscrittura "Commerce that lives where you work" |
| MCP rename `get_checkout_url` → `purchase_product` | 30 min | |

---

## Cosa va costruito da zero

### P0 — Bloccanti per il lancio

| Cosa | Effort | Dettaglio |
|------|--------|-----------|
| **CLI npm package (`fooshop`)** | 5-7 giorni | Comandi: `init`, `login`, `products add/list/edit/delete`, `orders list`, `analytics`, `config`, `open` |
| **CLI auth flow** | 1-2 giorni | `fooshop login` → browser `/cli-auth` → user approva → callback localhost → genera API key → salva `~/.fooshop/config.json` |
| **Endpoint `/api/cli-auth`** | 4-6 ore | Pagina web per approvare CLI login, genera API key con scopes creator |
| **MCP server write tools** | 2-3 giorni | `create_store`, `add_product`, `update_product` con auth via `FOOSHOP_API_KEY` |
| **API documentation** | 2-3 giorni | Markdown docs leggibili da Context7. Tutti endpoint, auth, esempi |
| **Pubblicazione Context7** | 2-4 ore | Registrare docs per Claude Code/Cursor auto-discovery |

### P1 — Necessari per il lancio ma non bloccanti

| Cosa | Effort | Dettaglio |
|------|--------|-----------|
| Store demo | 4-6 ore | 3-5 store con prodotti reali |
| Video demo | 4-6 ore | Claude Code + fooshop CLI → store live in 30 sec |

---

## Non serve per il lancio

| Cosa | Perché |
|------|--------|
| API versioning (`/api/v1/`) | Over-engineering. Versioning quando serve breaking change |
| Rate limiting per API key | IP rate limiting esiste già |
| OpenAPI spec | Markdown docs bastano |
| Webhooks | Nessuno li chiede al giorno 1 |
| SDK client (JS/Python) | curl + docs bastano |
| Prodotti fisici | Post-lancio |
| Tiered pricing + Stripe Billing | Post-lancio |
| Dashboard redesign | Post-lancio |
| Email transazionali | Post-lancio |

---

## Timeline

```
Settimana 1:  CLI package + auth flow + endpoint /cli-auth
              API key auth su tutte le route
              DEFAULT_COMMISSION_PERCENT → 8%

Settimana 2:  CLI comandi (init, products, orders, analytics)
              MCP server write tools
              API documentation

Settimana 3:  Landing page
              Context7 pubblicazione
              Store demo + video demo
              Polish + test

Lancio:       npm publish + HN Show HN
```

---

## Rischio principale

La CLI deve essere perfetta. Se `fooshop init` ha un bug o l'auth flow si blocca, il lancio HN muore. Le 3 settimane devono produrre una CLI che fa venire voglia di twittare.
