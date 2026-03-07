# Fooshop — Design Document

**Data:** 2026-03-06
**Owner:** Emanuele Caronia
**Status:** Approvato
**Dominio:** fooshop.ai

---

## Vision

Fooshop e' il primo marketplace di prodotti digitali nativamente pensato per essere venduto dalle AI. Headless commerce per creator, con un frontend di default generato da AI.

**One-liner:** *Your AI-powered storefront. Drop your products, AI finds your buyers.*

---

## Problema

I creator (freelancer, coach, educator, developer) vendono prodotti digitali con tool che:
- Costano troppo (Stan Store $99/mese) o prendono troppo (Gumroad 10%)
- Non aiutano a trovare clienti (sono solo storefront passivi)
- Non sono programmabili (no API, no headless, no integrazione con agenti AI)

Nessun tool esistente espone i prodotti in modo nativo agli agenti AI (ChatGPT, Claude, agenti custom). I creator dipendono interamente dal proprio marketing per il traffico.

---

## Soluzione

Un commerce layer headless e API-first per prodotti digitali:

1. **AI genera il tuo storefront in 30 secondi** — descrivi cosa vendi, Fooshop crea tutto (copy, layout, metadati)
2. **Catalogo esposto via MCP server** — qualsiasi agente AI puo' cercare e raccomandare i tuoi prodotti
3. **Zero costi fissi** — 5% commissione sulle vendite (+ fee Stripe), nessun abbonamento
4. **Headless** — usa il frontend di default o il tuo. API e MCP per integrare dove vuoi

---

## Differenziatori

| Feature | Fooshop | Stan Store | Gumroad | Lemonsqueezy |
|---------|---------|------------|---------|--------------|
| Prezzo fisso | Free | $99/mese | Free | Free |
| Commissione | 5% | 0% | 10% | 5% + $0.50 |
| AI store generation | Si | No | No | No |
| MCP server (AI discovery) | Si | No | No | No |
| Headless / API-first | Si | No | No | API limitata |
| Explore/marketplace | Si | No | Debole | No |

---

## Target user

**Creator che vendono prodotti digitali:**
- Ebook, PDF, guide
- Template (Notion, Figma, Canva)
- Corsi e video
- Preset (Lightroom, audio)
- Prompt pack, AI assets
- Asset grafici, font, icon pack

**NO prodotti fisici in V0.**

---

## Pricing

- **Free** per il creator, sempre. No subscription.
- **5% commissione** su ogni vendita
- Fee Stripe (~2.9% + $0.30) a carico del creator
- Totale effettivo per il creator: ~8% per transazione

---

## Architettura

### Principio: API-first, headless

```
                      CLIENTS
  Default Frontend    Custom Frontend    MCP Server
  (fooshop.ai/store)  (sito custom)      (npm package)
          |                 |                |
          v                 v                v
                      FOOSHOP API
  /products    /checkout    /orders
  /stores      /customers   /analytics

                      SERVICES
  AI Store Generator    Stripe Integration
  File Delivery         SEO Page Generator

                        DATA
  PostgreSQL              S3/R2 (file storage)

                    INTEGRATIONS
  PlugSync -> HubSpot       Stripe Webhooks
```

### Stack

| Layer | Scelta | Motivazione |
|-------|--------|-------------|
| Backend/API | Next.js (App Router) | API routes + frontend in un unico deploy |
| DB | PostgreSQL (Render) | Affidabile, free tier, competenza team |
| Auth | Auth.js | Google + email magic link |
| Pagamenti | Stripe Checkout + Connect | Split payment automatico (95/5) |
| File storage | Cloudflare R2 | S3-compatible, no egress fees |
| AI generation | Claude API | Store copy, descrizioni, metadati |
| MCP server | TypeScript, pacchetto npm | Espone catalogo come tool per agenti AI |
| Deploy | Render | Web service + PostgreSQL |
| ORM | Drizzle | Type-safe, leggero |

### Data model (V0)

```sql
-- Creator (chi vende)
creators
  id            uuid PK
  email         text UNIQUE
  name          text
  slug          text UNIQUE
  stripe_connect_id text
  store_name    text
  store_description text
  store_theme   jsonb
  created_at    timestamptz

-- Prodotto digitale
products
  id            uuid PK
  creator_id    uuid FK -> creators
  title         text
  slug          text UNIQUE
  description   text
  price_cents   integer
  currency      text DEFAULT 'usd'
  file_url      text
  metadata_json jsonb  -- structured data per AI/SEO
  status        text   -- draft | published
  created_at    timestamptz

-- Ordine
orders
  id            uuid PK
  product_id    uuid FK -> products
  creator_id    uuid FK -> creators
  buyer_email   text
  buyer_name    text
  amount_cents  integer
  platform_fee_cents integer
  stripe_payment_intent_id text
  status        text   -- pending | completed | refunded
  created_at    timestamptz

-- Page views (analytics)
page_views
  id            uuid PK
  product_id    uuid FK -> products
  source        text   -- web | mcp | api
  created_at    timestamptz
```

### API endpoints

**Pubbliche (no auth):**
- `GET /api/products` — catalogo, filtrabile per categoria/prezzo/query
- `GET /api/products/:slug` — dettaglio prodotto + metadati AI
- `GET /api/stores/:slug` — storefront di un creator
- `POST /api/checkout` — crea sessione Stripe Checkout
- `GET /api/explore` — homepage discover

**Creator (auth):**
- `POST /api/products` — crea prodotto
- `PUT /api/products/:id` — aggiorna
- `DELETE /api/products/:id` — rimuovi
- `GET /api/dashboard` — vendite, analytics
- `POST /api/store/generate` — AI genera/rigenera lo store

**MCP server tools:**
- `search_products(query, category, price_range)` — cerca nel catalogo
- `get_product(slug)` — dettaglio prodotto
- `get_store(slug)` — tutti i prodotti di un creator

---

## Flussi principali

### 1. Creator onboarding (30 secondi)

```
Login con Google
-> "Descrivi cosa vendi" (free text)
-> Claude genera: store name, bio, theme, prodotti suggeriti
-> Creator conferma/modifica
-> Upload file per ogni prodotto
-> Connessione Stripe Connect
-> Store live su fooshop.ai/tuonome
```

### 2. Acquisto

```
Buyer trova prodotto (Google, explore page, agente AI)
-> Pagina prodotto
-> "Buy" -> Stripe Checkout
-> Pagamento split (95% creator, 5% Fooshop)
-> Email con link download
-> PlugSync: buyer -> HubSpot contact, ordine -> deal
```

### 3. AI discovery (MCP)

```
Utente chiede a Claude/GPT: "cerco un template Notion per project management"
-> Agente interroga MCP server Fooshop
-> search_products("notion template project management")
-> Risultati con titolo, descrizione, prezzo, link checkout
-> Agente raccomanda e linka al checkout
```

---

## PlugSync integration

Fooshop e' il campo di test per PlugSync. La sincronizzazione:

| Fooshop | HubSpot | Direzione |
|---------|---------|-----------|
| Creator | Company | Fooshop -> HubSpot |
| Buyer | Contact | Fooshop -> HubSpot |
| Ordine | Deal | Fooshop -> HubSpot |
| Prodotto | Product | Fooshop -> HubSpot |
| Page view | Engagement event | Fooshop -> HubSpot |

Questo permette marketing automation su HubSpot:
- Welcome email a nuovi creator
- Nurturing sequence per creator che non hanno ancora pubblicato
- Segmentazione buyer per categoria prodotto
- Follow-up post-acquisto
- Reactivation per buyer inattivi

---

## V0 — Piano settimana

| Giorno | Deliverable |
|--------|-------------|
| 1 | Setup progetto, DB schema, auth, modello dati |
| 2 | CRUD prodotti, upload file, Stripe Connect onboarding |
| 3 | AI store generation (Claude API), pagina store pubblica |
| 4 | Checkout Stripe, delivery file, email conferma |
| 5 | MCP server, explore page, SEO meta tags |
| 6 | Dashboard creator, analytics base, polish UI |
| 7 | Deploy Render, test end-to-end, landing page |

---

## V1+ (post validazione)

- SDK JavaScript per embed/widget "Buy with Fooshop"
- API docs pubbliche
- Categorie e tagging avanzato
- Reviews e rating prodotti
- Creator analytics avanzati
- Piu' opzioni di pagamento (PayPal, crypto)
- Prodotti con subscription/membership

---

## Rischi

| Rischio | Mitigazione |
|---------|-------------|
| Nessun creator si iscrive | Seed con prodotti propri/team, outreach diretto a creator |
| MCP adoption ancora bassa | Il frontend di default funziona indipendentemente da MCP |
| Stripe Connect onboarding complesso | Documentazione step-by-step, fallback a Stripe Payment Links |
| Competizione replica velocemente | Il marketplace/network effect e' il moat a medio termine |
| Abuso piattaforma (pirateria, spam) | Review manuale iniziale, flag system |

---

## Obiettivo di validazione

Il prodotto e' validato quando:
1. 50+ creator registrati con almeno 1 prodotto pubblicato
2. 10+ vendite completate
3. PlugSync sincronizza correttamente con HubSpot
4. Almeno 1 vendita originata da MCP/AI discovery
