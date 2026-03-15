# [GEN-020] Override 0% commissione per primi 50 creator

**Issue:** #45
**Date:** 2026-03-15
**Status:** Approved

## Context

La strategia di lancio prevede "0% commissione per i primi 3/6 mesi" come incentivo per i primi 50 creator (seeding via DM outreach a creator Gumroad). Attualmente la commissione e' hardcoded al 5% in `lib/stripe.ts`. Non esiste un backoffice admin — la gestione avverra' tramite una CLI skill usabile direttamente da Claude Code.

## Design

### 1. Schema DB

Due campi nuovi sulla tabella `creators`:

- `commission_override_percent` (integer, nullable, range 0-100) — commissione override in percentuale (0 = zero commissione). `null` = usa il default 5%.
- `commission_override_expires_at` (timestamp with timezone, nullable) — scadenza dell'override. `null` con override attivo = nessuna scadenza.

**Validazione:** `commission_override_percent` deve essere nell'intervallo 0-100. Enforcement a livello di CLI script (non DB constraint, per semplicita').

**Override attivo quando:** `commission_override_percent` IS NOT NULL AND (`commission_override_expires_at` IS NULL OR `commission_override_expires_at` > NOW()).

### 2. Logica `calculatePlatformFee`

Firma aggiornata (backward-compatible):

```ts
calculatePlatformFee(
  amountCents: number,
  creator?: {
    commissionOverridePercent: number | null;
    commissionOverrideExpiresAt: Date | null;
  }
): number
```

Logica:
1. Se `creator` passato, `commissionOverridePercent` non null, e `commissionOverrideExpiresAt` nel futuro o null → usa `commissionOverridePercent`
2. Altrimenti → 5% default

Caller da aggiornare:
- `src/app/api/checkout/route.ts` (riga 121) — passa il creator record (gia' disponibile in scope)
- `src/app/api/stripe/webhook/route.ts` (riga 52) — serve aggiungere una query per fetchare il creator record (attualmente ha solo `creatorId` dal metadata)

**Nota sul webhook:** Il fee reale addebitato da Stripe e' quello calcolato al checkout (via `application_fee_amount`). Il webhook ricalcola indipendentemente per salvare `platformFeeCents` nell'ordine. Con override time-sensitive, potrebbe esserci divergenza se l'override scade tra checkout e webhook. Soluzione: nel webhook, leggere `application_fee_amount` direttamente dalla Stripe session invece di ricalcolare. Questo elimina la possibilita' di mismatch.

### 3. Dashboard — Banner promozione

Banner informativo nella dashboard del creator (sopra le quick actions) visibile solo quando l'override e' attivo:

> **0% commission** — Your early-bird promotion is active until September 15, 2026

Nessuna azione richiesta dal creator. Inline nella dashboard page, nessun componente separato.

### 4. CLI — Skill `/creators`

Skill Claude Code per gestione admin creator con focus su commission override.

**Comandi:**
- `/creators search <query>` — cerca per nome, email o slug
- `/creators info <email-or-slug>` — dettagli completi (nome, store, Stripe status, prodotti count, ordini count, override attivo)
- `/creators set-commission <email-or-slug> <percent> <duration>` — setta override (durate: `3months`, `6months`, `12months`, `permanent`)
- `/creators remove-commission <email-or-slug>` — rimuove override (setta entrambi i campi a null)
- `/creators list-overrides` — tutti i creator con override attivo

**Implementazione:** script Node.js `src/scripts/creators-admin.ts` che si connette al DB direttamente (usa `dotenv/config` e il client DB condiviso da `src/db/index.ts`, come `seed.ts`). La skill lo invoca via Bash con i parametri appropriati. Supporta `DATABASE_URL` env override per uso in produzione.

**Migrazione:** `pnpm drizzle-kit generate` + `pnpm drizzle-kit push`. Colonne nullable, quindi non-destructive e non richiede default.

## Out of scope

- Admin dashboard web
- MCP server admin
- CRUD completo creator (modifica nome/slug, cancellazione)
- Enforcement automatico del cap 50 creator
