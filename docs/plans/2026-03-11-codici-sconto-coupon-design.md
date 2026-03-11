# [GEN-012] Codici Sconto e Coupon — Design

**Issue:** #25
**Date:** 2026-03-11
**Status:** Approved

## Summary

I creator possono creare codici sconto (percentuale o importo fisso) da applicare al checkout. I codici sono scoped per creator con restrizione opzionale per prodotto. Lo sconto è calcolato server-side e il prezzo finale viene passato a Stripe, mantenendo il sistema disaccoppiato dal payment provider.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope codici | Creator-scoped + product restriction opzionale | Ogni creator gestisce i propri codici; opzionalmente limitabili a un prodotto |
| Feature set | Standard (%, fisso, scadenza, limite utilizzi, prodotto, importo minimo) | Copre i casi d'uso reali senza over-engineering; features avanzate (per-customer limit, first-purchase-only) rimandate a quando ci saranno buyer accounts |
| Integrazione Stripe | Calcolo server-side, `unit_amount` scontato passato a Stripe | Disaccoppiato dal payment provider; consente futuri provider alternativi |
| UX buyer | Link "Hai un codice sconto?" sotto BuyButton, espande campo inline | Zero friction per chi non ha coupon; nessuna modal o pagina intermedia |
| Dashboard creator | Sezione dedicata `/dashboard/coupons` | I coupon possono essere store-wide, serve una vista separata |
| Codice coupon | Pre-generato random, editabile dal creator | Chi vuole branding lo scrive, gli altri hanno un codice pronto |

## Data Model

### New table: `coupons`

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| creator_id | uuid FK → creators | NOT NULL |
| code | text | Uppercase, NOT NULL |
| discount_type | enum(`percentage`, `fixed`) | NOT NULL |
| discount_value | integer | Percentuale (es. 20) o centesimi (es. 500), NOT NULL |
| product_id | uuid FK → products, nullable | Se null = vale per tutto lo store |
| min_amount_cents | integer, nullable | Importo minimo ordine |
| max_redemptions | integer, nullable | Se null = illimitato |
| redemption_count | integer, default 0 | Utilizzi correnti |
| expires_at | timestamp, nullable | Scadenza opzionale |
| active | boolean, default true | On/off manuale |
| created_at | timestamp | |

**Constraint:** `UNIQUE(creator_id, code)` — stesso codice può esistere per creator diversi.

### Modified table: `orders`

| Campo | Tipo | Note |
|-------|------|------|
| coupon_id | uuid FK → coupons, nullable | Traccia quale coupon è stato usato |

## API Endpoints

### Creator endpoints (auth'd)

- `GET /api/coupons` — lista coupon del creator autenticato
- `POST /api/coupons` — crea nuovo coupon
- `PUT /api/coupons/[id]` — aggiorna coupon (toggle active, modifica campi)

### Public endpoint

- `POST /api/coupons/validate` — valida codice per un prodotto specifico
  - Input: `{ code, productId }`
  - Output: `{ valid, discountType, discountValue, discountedPriceCents }` oppure `{ valid: false, error }`

## Flow: Buyer Checkout con Coupon

1. Product page: link "Hai un codice sconto?" sotto il BuyButton
2. Click → espande inline campo testo + bottone "Applica"
3. Client chiama `POST /api/coupons/validate` con `{ code, productId }`
4. Se valido: prezzo aggiornato mostrato sopra il BuyButton
5. Click "Buy Now" → `POST /api/checkout` con `{ productId, couponCode }` aggiuntivo
6. Server ri-valida il coupon, calcola prezzo scontato, incrementa `redemption_count` atomicamente
7. Crea Stripe Checkout session con `unit_amount` = prezzo scontato
8. Platform fee (5%) calcolata sul prezzo post-sconto

## Flow: Creator Dashboard

### `/dashboard/coupons` — Lista

- Tabella: codice, tipo sconto, valore, prodotto (o "Tutti"), utilizzi/limite, stato (attivo/scaduto/esaurito), scadenza
- Bottone "Nuovo coupon"
- Toggle attivo/disattivo inline

### Form creazione coupon

- Codice: campo pre-compilato con codice random (6 chars, alfanumerico uppercase), editabile
- Tipo sconto: select (Percentuale / Importo fisso)
- Valore: input numerico (% o importo in valuta)
- Prodotto: select opzionale (lista prodotti del creator)
- Scadenza: date picker opzionale
- Limite utilizzi: input numerico opzionale
- Importo minimo: input numerico opzionale

## Security

- **Doppia validazione**: client-side per UX + server-side nel checkout (source of truth)
- **Race condition**: `UPDATE coupons SET redemption_count = redemption_count + 1 WHERE id = $1 AND (max_redemptions IS NULL OR redemption_count < max_redemptions)` — atomico, nessun TOCTOU
- **Case-insensitive**: codice sempre convertito a uppercase prima di salvataggio e lookup
- **Auth check**: endpoint creator richiedono sessione autenticata + verifica ownership del coupon

## Calcolo Sconto

```typescript
function applyDiscount(priceCents: number, coupon: { discountType: string; discountValue: number }): number {
  if (coupon.discountType === "percentage") {
    return Math.max(0, priceCents - Math.round(priceCents * coupon.discountValue / 100));
  }
  // fixed
  return Math.max(0, priceCents - coupon.discountValue);
}
```

- Il prezzo non può mai andare sotto 0
- La platform fee si calcola sul prezzo scontato: `calculatePlatformFee(discountedPriceCents)`
