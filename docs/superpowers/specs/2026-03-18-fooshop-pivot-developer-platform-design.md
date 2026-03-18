# Fooshop Pivot: Developer-First Ecommerce Platform

**Data:** 2026-03-18
**Status:** Approvato
**Owner:** Emanuele Caronia

---

## Posizionamento e Target

**Fooshop — Il Vercel dell'ecommerce.**

`fooshop init` → il tuo store è live. CLI-first, AI-native, MCP-enabled.

**Target:** Developer che vogliono vendere qualsiasi cosa (digitale o fisica) senza configurare nulla. Non è un'alternativa a Gumroad — è per chi non avrebbe mai aperto un Gumroad.

**Pitch:** "Il modo più veloce per un developer di vendere qualsiasi cosa online."

**Differenziatori:**
- CLI come interfaccia primaria (nessun competitor ce l'ha)
- MCP server per vendere e comprare via agenti AI
- AI genera store, copy, metadati
- Fisico + digitale dal giorno 1
- Pricing developer-friendly (free tier generoso, 0% commissione al tier top)

**NON è:**
- Un marketplace (non c'è una homepage "esplora prodotti" come focus primario)
- Un'alternativa cheap a Gumroad
- Un framework self-hostable

---

## Architettura e Interfacce

**Tre interfacce, un unico backend API:**

```
CLI (fooshop)  ──→
Dashboard web  ──→  API REST  ──→  DB + Stripe + R2
MCP server     ──→
```

Tutto passa per le stesse API. La CLI non è un wrapper della dashboard — sono peer. Il MCP server usa le stesse API per read/write/purchase.

### CLI (`fooshop` — pacchetto npm globale)

- `fooshop init` → crea store (AI genera tema, copy, metadati)
- `fooshop products add` → aggiunge prodotto (digitale o fisico)
- `fooshop products list/edit/delete`
- `fooshop orders list`
- `fooshop analytics`
- `fooshop config` → dominio custom, Stripe, tema
- `fooshop open` → apre dashboard nel browser
- Auth via `fooshop login` (browser OAuth flow, salva token locale)

### Dashboard web (fooshop.ai/dashboard)

- Parità funzionale con CLI
- Design pulito tipo Render/Railway
- Al lancio: funzionale ma basic. Migliora nel tempo

### MCP server (`@fooshop/mcp` — npm)

- **Read:** `search_products`, `get_product`, `get_store`
- **Write:** `create_store`, `add_product`, `update_product`
- **Purchase:** `purchase_product` → restituisce checkout URL
- Parametro opzionale `--store=slug` per scoping su singolo store

```
npx @fooshop/mcp                    # tutta la piattaforma
npx @fooshop/mcp --store=mario      # solo lo store di mario
```

### API REST

- Quelle esistenti (products, checkout, store, upload, orders)
- Da aggiungere: auth token per CLI, endpoints mancanti per parità CLI/dashboard

---

## Prodotti e Checkout

### Tipi di prodotto

| Tipo | Checkout | Delivery |
|------|----------|----------|
| **Digitale** | Pagamento → download automatico | File su R2, link con token temporaneo |
| **Fisico** | Pagamento + indirizzo spedizione | Email al seller con dati ordine + indirizzo. Il seller spedisce da solo |

Il seller sceglie il tipo quando crea il prodotto. Un singolo store può avere sia prodotti digitali che fisici.

### Checkout flow (fisico)

- Stessa Stripe Checkout session di oggi
- In più: campi indirizzo di spedizione (Stripe `shipping_address_collection`)
- Al completamento: webhook crea ordine + manda email al seller con dettagli di spedizione
- Il buyer riceve email di conferma ordine

### Cosa NON c'è (per ora)

- Nessuna integrazione corrieri
- Nessun tracking automatico
- Nessun inventory management
- Nessun calcolo spese di spedizione (il seller le include nel prezzo o le indica nella descrizione)

---

## Pricing

| Tier | Prezzo | Commissione | Cosa include |
|------|--------|-------------|-------------|
| **Free** | $0 | 8% | 10 prodotti, store su fooshop.ai/slug, CLI, MCP, "Powered by Fooshop" nel footer |
| **Pro** | $19/mese | 3% | Prodotti illimitati, dominio custom, niente badge, analytics avanzati |
| **Business** | $49/mese | 0% | Tutto Pro + API priority, webhook, supporto prioritario |

### Breakeven per il seller

- Free → Pro conviene a ~$380/mese di vendite (il 5% risparmiato = $19)
- Pro → Business conviene a ~$1000/mese di vendite (il 3% risparmiato = $30)

### Billing

- Subscription via Stripe Billing
- Le commissioni vengono trattenute al momento del checkout (via `application_fee_amount`)
- Il tier Free non richiede carta di credito

### Free tier come motore virale

- Badge "Powered by Fooshop" su ogni store gratuito
- Il badge linka a fooshop.ai con referral del seller

---

## Lancio e Go-to-Market

**Il lancio è un momento tech, non "trovare creator".**

### Asset per il lancio

1. **`fooshop` su npm** — il developer installa e prova in 30 secondi
2. **`@fooshop/mcp` su npm** — il primo ecommerce acquistabile da agenti AI
3. **Video demo (30-60 sec):** terminale, `fooshop init`, store live. Poi un agente AI che trova il prodotto e genera un checkout link
4. **Post su Hacker News:** "Show HN: Fooshop — deploy an e-commerce store from your terminal"

### Canali

- Hacker News (Show HN)
- X/Twitter (developer audience)
- Reddit: r/SideProject, r/webdev, r/nextjs
- Product Hunt (secondo lancio, dopo feedback HN)

### Cosa serve prima del lancio

- CLI funzionante (`init`, `login`, `products add`, `orders list`)
- MCP server con read + write + purchase
- 3-5 store demo con prodotti reali
- Landing page riscritta con posizionamento developer

### Cosa NON serve prima del lancio

- 50 creator reali
- Dashboard perfetta
- Prodotti fisici (può arrivare subito dopo)
- Tier Pro/Business implementati (lanci con Free, aggiungi i tier dopo)

### Sequenza

1. CLI + MCP server + landing page nuova
2. Video demo
3. Post HN + X + Reddit
4. Raccogli feedback, itera
5. Aggiungi tier, fisico, dashboard bella

---

## Cosa cambia rispetto a oggi

### Cosa resta (non si butta nulla)

- Stripe Connect checkout
- Auth (next-auth)
- Upload su R2 + download con token
- Schema DB (creators, products, orders, page_views)
- API routes esistenti
- AI store generation
- MCP server (base da estendere)

### Cosa cambia

| Area | Oggi | Dopo |
|------|------|------|
| Posizionamento | Marketplace per creator | Piattaforma ecommerce per developer |
| Interfaccia primaria | Dashboard web | CLI + dashboard |
| Landing page | "Sell digital products with zero upfront costs" | "Deploy an e-commerce store from your terminal" |
| Prodotti | Solo digitali | Digitali + fisici (dumb shipping) |
| MCP server | Read-only | Read + Write + Purchase |
| Pricing | 5% flat | Free 8% / Pro $19 3% / Business $49 0% |
| Target | Template/preset creator | Developer |
| Explore page | Focus primario | Esiste ma secondario |

### Cosa va costruito

1. **CLI npm package** (`fooshop`) — nuovo
2. **API auth token system** — nuovo (per CLI e MCP write)
3. **MCP server write + purchase tools** — estensione
4. **Supporto prodotti fisici** — schema + checkout + email
5. **Pricing tiers + Stripe Billing** — nuovo
6. **Landing page** — riscrittura
7. **Dashboard redesign** — iterativo, non bloccante per il lancio

---

## Evoluzione futura (non per il lancio)

### Da A (hosted platform) a C (API as a service)

Quando i developer chiedono "posso usare Fooshop come backend per il mio frontend custom?", si espone l'API come servizio. Stessa sequenza di Vercel: hosted first, API after.

### Acquisti via agente AI

Al lancio: `purchase_product` restituisce un checkout URL (l'umano completa il pagamento).
Futuro: token di pagamento pre-autorizzati per acquisti autonomi da parte degli agenti.

### CLI scriptabile

Flag `--json` su tutti i comandi, pipe support, integrazione CI/CD. Arriva naturalmente dopo la CLI base.
