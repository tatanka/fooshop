# Email transazionali post-acquisto con download link

**Issue:** #24 [GEN-011]
**Data:** 2026-03-11
**Stato:** Approvato

## Problema

Il buyer riceve il link di download solo nella success page. Se chiude il tab, perde il file. Senza email transazionale Fooshop non è usabile per vendite reali.

## Decisioni

| Decisione | Scelta | Motivazione |
|-----------|--------|-------------|
| Email provider | Mailtrap | Buona DX, sandbox per testing, SDK Node.js |
| Template engine | React Email | HTML styled + plain text fallback automatico |
| Contenuto | Completo | Prodotto, prezzo, store/creator, ordine, data, supporto |
| Token email | Separato, 72h | Più tempo del token web (24h), analytics distinte |
| Architettura | Invio nel webhook | Semplice, immediato, evolvibile in retry later |

## Architettura

```
Stripe webhook (checkout.session.completed)
  └─ DB transaction: crea order + download token (24h, success page)
  └─ Dopo TX: crea secondo download token (72h, email)
  └─ Invia email via Mailtrap API con React Email template
```

## Componenti

1. **`src/lib/email.ts`** — Client Mailtrap + funzione `sendPurchaseConfirmation()`
2. **`src/emails/purchase-confirmation.tsx`** — Template React Email (HTML + plain text)
3. **Webhook update** — Dopo la transaction, crea token 72h e invia email
4. **Schema update** — Campo `source` su `download_tokens` (`"web"` | `"email"`)

## Contenuto email

- **Oggetto:** "Il tuo acquisto: {productName}"
- **Corpo:** nome prodotto, prezzo formattato, nome store/creator, ID ordine (UUID short), data acquisto, bottone download (token 72h), nota scadenza 72h, email creator come supporto

## Dipendenze

- `mailtrap` (SDK Node.js)
- `@react-email/components` (template)

## Env vars

- `MAILTRAP_API_TOKEN` — API token Mailtrap
- `EMAIL_FROM` — mittente (es. `noreply@fooshop.ai`)

## Approcci scartati

- **Flag `emailSent` + cron retry** — Complessità non giustificata al volume attuale
- **Queue asincrona** — Overkill, si può evolvere in futuro
- **Stesso token 24h** — Troppo breve per email, nessuna distinzione analytics
