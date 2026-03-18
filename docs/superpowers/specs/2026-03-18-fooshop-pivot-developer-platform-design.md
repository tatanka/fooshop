# Fooshop Pivot: Developer-First Ecommerce Platform

**Data:** 2026-03-18
**Status:** Approvato
**Owner:** Emanuele Caronia

---

## Posizionamento e Target

**Fooshop — Commerce that lives where you work.**

Nel 2026 il developer vive nel terminale con un AI assistant. Qualsiasi tool che lo costringe ad aprire un browser e cliccare su una UI è frizione. Shopify, Gumroad, WooCommerce — tutti ti tirano fuori dal tuo workflow. Fooshop no.

`fooshop init` → store live. Parli con Claude → gestisci lo shop via MCP. Chiami l'API → commerce embedded nel tuo prodotto. Senza mai lasciare il terminale.

**Il pain:** Ogni strumento commerce ti tira fuori dal tuo workflow. Più gli AI assistant diventano il modo di lavorare, più qualsiasi UI web diventa un'interruzione. Questo pain peggiora nel tempo, non migliora.

**La soluzione:** Commerce che vive dove lavori — terminale, AI assistant, API. Non un'interfaccia web con un'API attaccata. Un'infrastruttura commerce nativa per l'era degli AI coding tools.

**Tagline:** "Add commerce to anything. One command. One API."

**Target segments:**

| Segmento | Chi sono | Come usano Fooshop | ARPU |
|----------|----------|-------------------|------|
| Indie developer | Vende i propri template, boilerplate, corsi | `fooshop init` → vende. Gestisce via Claude + MCP | $0-49/mese |
| Freelancer | Costruisce ecommerce per clienti | Fooshop API per ogni progetto. Setup in un'ora, non in una settimana | $49-149/mese |
| Agency | Team con 10-50+ progetti ecommerce | Stack standard per tutti i progetti. CLI per gestione multi-store | $200-500/mese |
| Startup | Ha bisogno di commerce nel prodotto | Fooshop API embedded. Non serve costruire un backend commerce | $200-2000/mese |
| Enterprise/SaaS | Commerce layer nel proprio prodotto | API + custom integration | $2000+/mese |

**Differenziatori:**
- **CLI-first:** commerce dal terminale. Nessun competitor ce l'ha
- **MCP-native:** gestisci il tuo shop parlando con Claude/Cursor/Gemini. Il primo ecommerce operabile da AI assistant
- **API pubblica dal giorno 1:** non un'evoluzione futura, il core del prodotto
- **AI genera store, copy, metadati:** zero configurazione
- **Digitale + fisico:** un'unica piattaforma
- **Pricing developer-friendly:** free tier generoso, 0% commissione al tier top

**Perché nessun incumbent può copiarlo:**
- **Shopify** è costruito per merchant che cliccano su UI. Il loro business model dipende dalla web UI. Non faranno mai CLI-first — ucciderebbe il loro prodotto
- **Gumroad** è in maintenance mode dal 2024. ~1 dipendente. Non sta costruendo nulla
- **Stripe** fa payment, non storefront. È complementare, non competitore
- **Commercetools/Commerce Layer** costano $200K+/anno e richiedono mesi di setup. Fooshop è 30 secondi

**NON è:**
- Un marketplace (non c'è una homepage "esplora prodotti" come focus primario)
- Un'alternativa cheap a Gumroad (stessa fee o più alta, 10x più valore)
- Un framework self-hostable
- Una UI web con un'API attaccata — è il contrario

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

- `fooshop init` → sequenza: login (se non autenticato) → crea store (AI genera tema, copy, metadati). Stripe Connect onboarding si fa dopo, al primo `fooshop products add` o dalla dashboard
- `fooshop products add` → aggiunge prodotto (digitale o fisico)
- `fooshop products list/edit/delete`
- `fooshop orders list`
- `fooshop analytics`
- `fooshop config` → dominio custom, Stripe, tema
- `fooshop open` → apre dashboard nel browser
- Auth via `fooshop login` → apre browser su fooshop.ai/cli-auth, l'utente approva, callback su localhost con token. Token (API key) salvato in `~/.fooshop/config.json`. Usa il sistema API keys già esistente nel DB (`apiKeys` table)

### Dashboard web (fooshop.ai/dashboard)

- Parità funzionale con CLI
- Design pulito tipo Render/Railway
- Al lancio: funzionale ma basic (quella attuale). Migliora nel tempo

### MCP server (`@fooshop/mcp` — npm)

- **Read (no auth):** `search_products`, `get_product`, `get_store` (esistenti)
- **Write (auth via API key):** `create_store`, `add_product`, `update_product`
- **Purchase (no auth):** `purchase_product` → restituisce checkout URL (evoluzione del `get_checkout_url` esistente)
- Parametro opzionale `--store=slug` per scoping su singolo store (read-only, per buyer)
- Auth per write: l'utente configura l'API key come env var `FOOSHOP_API_KEY` oppure via `--api-key` flag

```
npx @fooshop/mcp                                    # read-only, tutta la piattaforma
npx @fooshop/mcp --store=mario                       # read-only, solo store di mario
FOOSHOP_API_KEY=xxx npx @fooshop/mcp                 # read + write per il proprio store
```

### API REST

- Quelle esistenti (products, checkout, store, upload, orders)
- Il sistema API keys esiste già (`apiKeys` table + `lib/api-key.ts`). Va esteso per supportare il flusso CLI login (generazione key da browser callback)
- Aggiungere: API key auth middleware sulle route che oggi usano solo session auth

---

## Prodotti e Checkout

### Tipi di prodotto

| Tipo | Checkout | Delivery |
|------|----------|----------|
| **Digitale** | Pagamento → download automatico | File su R2, link con token temporaneo (come oggi) |
| **Fisico** | Pagamento + indirizzo spedizione | Email al seller con dati ordine + indirizzo. Il seller spedisce da solo |

Il seller sceglie il tipo quando crea il prodotto. Un singolo store può avere sia prodotti digitali che fisici.

### Schema changes per prodotti fisici

- `products` table: aggiungere campo `type` (`digital` | `physical`), default `digital`
- `orders` table: aggiungere campo `shipping_address` (JSONB, nullable) per nome, indirizzo, città, CAP, paese
- Nessun campo weight/dimensions (non serve senza integrazione corrieri)

### Checkout flow (fisico)

- Stessa Stripe Checkout session di oggi
- In più: `shipping_address_collection` abilitato su Stripe quando il prodotto è fisico
- Al completamento: webhook crea ordine con `shipping_address` + manda email al seller con dettagli di spedizione
- Il buyer riceve email di conferma ordine

### Email

Il codebase attuale non ha un sistema email. Per il lancio:
- **Servizio:** Resend (developer-friendly, free tier 100 email/giorno, SDK npm)
- **Template:** email transazionali minimali (ordine ricevuto per seller, conferma acquisto per buyer)
- Le email servono sia per ordini fisici che digitali (conferma acquisto)

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

- Free → Pro: il risparmio è 5% (8% - 3%). A $380/mese di vendite, il 5% = $19 → copre il costo Pro
- Pro → Business: il risparmio è 3% (3% - 0%). Il delta subscription è $30/mese ($49 - $19). A $1000/mese di vendite, il 3% = $30 → copre il delta

### Migrazione utenti esistenti

Gli utenti attuali sono pochi (test/alpha). Vengono migrati al tier Free a 8%. Quelli con commission override attive (early bird a 0%) mantengono l'override fino a scadenza. Dopo scadenza, passano al tier Free standard.

### Billing

- Subscription via Stripe Billing (nuovo). Richiede: Customer object, subscription lifecycle webhooks (created, updated, canceled, past_due), gestione dunning
- Campo `tier` (`free` | `pro` | `business`) sulla tabella `creators`, default `free`
- La commissione è determinata dal tier, non più dal `DEFAULT_COMMISSION_PERCENT`. Il sistema override esistente resta come fallback per promozioni
- Le commissioni vengono trattenute al momento del checkout (via `application_fee_amount`)
- Il tier Free non richiede carta di credito

### Free tier come motore virale

- Badge "Powered by Fooshop" su ogni store gratuito
- Il badge linka a fooshop.ai con referral del seller

---

## Feature esistenti

Le seguenti feature sopravvivono al pivot:

| Feature | Status | Note |
|---------|--------|------|
| Coupon system | Resta | Utile per developer, esponibile via CLI (`fooshop coupons`) |
| Referral/affiliate | Resta | Il badge "Powered by Fooshop" è il referral naturale |
| Admin panel | Resta | Per gestione interna |
| Buy intents tracking | Resta | Analytics |
| Explore page | Resta ma secondaria | Non è il focus, ma utile per SEO e discovery |
| Commission overrides | Resta | Per promozioni, sovrascrive il tier temporaneamente |

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

### Cosa serve prima del lancio (MVP)

- CLI funzionante (`init`, `login`, `products add`, `orders list`)
- MCP server con read + write + purchase
- API documentation pubblica (le API esistono già, servono docs)
- 3-5 store demo con prodotti reali
- Landing page riscritta con posizionamento developer ("Add commerce to anything")
- Commissione 8% (tier Free, unico tier al lancio)

### Cosa NON serve prima del lancio

- 50 creator/developer reali
- Dashboard redesign
- Prodotti fisici (arriva subito dopo)
- Tier Pro/Business e Stripe Billing (arriva dopo validazione)
- Email transazionali (arrivano con il fisico)

### Sequenza

1. CLI + MCP server esteso + API docs + landing page nuova → **lancio**
2. Feedback + iterazione
3. Prodotti fisici + email (Resend)
4. Tier Pro/Business + Stripe Billing
5. Dashboard redesign tipo Render

---

## Cosa cambia rispetto a oggi

### Cosa resta (non si butta nulla)

- Stripe Connect checkout
- Auth (next-auth) + API keys system esistente
- Upload su R2 + download con token
- Schema DB (creators, products, orders, page_views)
- API routes esistenti
- AI store generation
- MCP server (base da estendere, include già `get_checkout_url`)
- Coupon, referral, admin, buy intents

### Cosa cambia

| Area | Oggi | Dopo |
|------|------|------|
| Posizionamento | Marketplace per creator | Piattaforma ecommerce per developer |
| Interfaccia primaria | Dashboard web | CLI + dashboard |
| Landing page | "Sell digital products with zero upfront costs" | "Add commerce to anything. One command. One API." |
| Prodotti | Solo digitali | Digitali + fisici (dumb shipping) — post-lancio |
| MCP server | Read + `get_checkout_url` | Read + Write + Purchase (con auth) |
| Pricing | 5% flat | Free 8% / Pro $19 3% / Business $49 0% |
| Target | Template/preset creator | Developer |
| Explore page | Focus primario | Esiste ma secondario |

### Cosa va costruito

**Per il lancio (MVP):**
1. **CLI npm package** (`fooshop`) — nuovo
2. **CLI auth flow** — browser OAuth → localhost callback → API key salvata. Estensione del sistema API keys esistente
3. **API key auth middleware** — le route API accettano sia session che API key
4. **API documentation** — le API routes esistono già, servono docs pubbliche (README o /docs)
5. **MCP server write tools** — `create_store`, `add_product`, `update_product` (con auth via API key)
6. **MCP `purchase_product`** — evoluzione di `get_checkout_url` esistente
7. **Landing page** — riscrittura con posizionamento "Add commerce to anything"
8. **Commissione 8%** — aggiornamento `DEFAULT_COMMISSION_PERCENT`

**Post-lancio:**
9. **Prodotti fisici** — campo `type` su products, `shipping_address` su orders, Stripe `shipping_address_collection`
10. **Email transazionali** — Resend integration per conferme ordine e notifiche seller
11. **Pricing tiers** — campo `tier` su creators, Stripe Billing integration, subscription webhooks
12. **Dashboard redesign** — iterativo

---

## Evoluzione futura (non per il lancio)

### API as a service

L'API è pubblica dal giorno 1 (documentata). L'evoluzione è aggiungere: rate limiting per tier, usage tracking, API analytics dashboard, SDK client (JS/Python). Quando freelancer e agency iniziano a usare Fooshop come backend per progetti clienti, aggiungere pricing usage-based.

### Acquisti via agente AI

Al lancio: `purchase_product` restituisce un checkout URL (l'umano completa il pagamento).
Futuro: token di pagamento pre-autorizzati per acquisti autonomi da parte degli agenti.

### CLI scriptabile

Flag `--json` su tutti i comandi, pipe support, integrazione CI/CD. Arriva naturalmente dopo la CLI base.
