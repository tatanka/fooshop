# Creators Admin: API-based CLI

**Date:** 2026-03-15
**Status:** Draft

## Problem

The `creators-admin` CLI script accesses the database directly via Drizzle ORM. This means it only works with the local DB (or whichever `DATABASE_URL` is configured). We need it to work against staging (and optionally production) via the existing admin API endpoints.

## Solution

1. Extend the admin API endpoints to support search and commission override operations
2. Rewrite the CLI to use HTTP calls instead of direct DB access
3. Add a config file for base URL and API key

## API Changes

### `GET /api/admin/creators`

Add query parameters:

- `?q=<term>` — filter by name, email, or slug (ILIKE `%term%`). If omitted, return all.
- `?overrides=active` — return only creators with active commission overrides (non-null, not expired).

Add fields to the response:

- `commissionOverridePercent` (integer | null)
- `commissionOverrideExpiresAt` (ISO string | null)

Scope: `admin:read:creators` (unchanged).

### `PATCH /api/admin/creators/[id]`

Extend allowed fields:

- `commissionOverridePercent` (integer 0-100 | null)
- `commissionOverrideExpiresAt` (ISO date string | null)

Setting both to `null` removes the override (replaces the `remove-commission` command).

Scope: `admin:write:creators` (unchanged).

## CLI Config

File: `~/.fooshop/config.json`

```json
{
  "baseUrl": "https://fooshop-staging.onrender.com",
  "apiKey": "fsk_..."
}
```

Environment variable overrides: `FOOSHOP_BASE_URL`, `FOOSHOP_API_KEY`.

Priority: env var > config file. If neither is available, exit with an error and instructions.

## CLI Rewrite

Remove all direct DB imports (`db`, `drizzle`, `dotenv`, schema). Use native `fetch()`.

### Command mapping

| Command | API Call |
|---------|----------|
| `search <q>` | `GET /api/admin/creators?q=<q>` |
| `info <email-or-slug>` | `GET /api/admin/creators?q=<query>` → exact match on email or slug |
| `set-commission <q> <percent> <duration>` | Find creator → `PATCH /api/admin/creators/[id]` with `commissionOverridePercent` and `commissionOverrideExpiresAt` |
| `remove-commission <q>` | Find creator → `PATCH /api/admin/creators/[id]` with both fields set to `null` |
| `list-overrides` | `GET /api/admin/creators?overrides=active` |

`parseDuration` stays in the CLI — it computes the expiration date and sends the ISO string to the server.

### Output format

Same text format as today. No changes to user-facing output.

## What doesn't change

- Auth mechanism (API key with Bearer token, same scopes)
- CLI command interface (same subcommands and arguments)
- Skill `/creators` (same commands, different execution underneath)

## Files to modify

- `src/app/api/admin/creators/route.ts` — add `?q=` and `?overrides=active` filters, add commission fields to response
- `src/app/api/admin/creators/[id]/route.ts` — extend PATCH allowed fields
- `src/scripts/creators-admin.ts` — full rewrite to use HTTP

## Files to create

None. `~/.fooshop/config.json` is created manually by the user.
