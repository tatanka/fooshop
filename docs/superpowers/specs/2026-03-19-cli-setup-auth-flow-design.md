# CLI Package Setup + Auth Flow (fooshop login)

**Issue:** #81
**Date:** 2026-03-19
**Status:** Design

## Overview

New npm package `fooshop` in `cli/` directory. First command: `fooshop login` — browser-based OAuth flow that generates an API key and saves it locally.

## Architecture

Two parts: CLI package (standalone npm) and web endpoints (existing Next.js app).

### Auth Flow

```
CLI (fooshop login)
  → finds free port, starts localhost HTTP server on :<port>
  → opens browser to <baseUrl>/cli-auth?port=<port>

Browser (/cli-auth)
  → if not logged in: redirect to Google OAuth, then back to /cli-auth?port=<port>
  → if logged in: show approval page ("Fooshop CLI wants to access your account")
  → user clicks "Approve"
  → POST /api/auth/cli-callback with port in body

Server (/api/auth/cli-callback)
  → verify session
  → find or create creator record
  → generate API key (all CREATOR_SCOPES)
  → redirect to http://localhost:<port>/callback?key=fsk_xxx&email=user@example.com

CLI receives callback
  → saves key + email + baseUrl to ~/.fooshop/config.json
  → prints "✓ Logged in as user@example.com"
  → shuts down server, exits
```

## CLI Package

### Structure

```
cli/
  package.json          # name: "fooshop", bin: { fooshop: "./dist/index.js" }
  tsconfig.json
  src/
    index.ts            # Commander.js entry point
    commands/
      login.ts          # fooshop login command
    lib/
      config.ts         # read/write ~/.fooshop/config.json
      server.ts         # localhost callback HTTP server
      open.ts           # open browser cross-platform
```

### Dependencies

- `commander` — CLI framework
- `open` — cross-platform browser open

### Config File

`~/.fooshop/config.json`:

```json
{
  "apiKey": "fsk_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "baseUrl": "https://fooshop.ai",
  "email": "emanuele@exelab.com"
}
```

Environment variable overrides:
- `FOOSHOP_BASE_URL` — overrides `baseUrl` (defaults to `https://fooshop.ai`)
- `FOOSHOP_API_KEY` — overrides `apiKey` from config file

### Login Command

1. Check if already logged in (config exists with valid key) — if so, print current email and ask to re-login
2. Find a free port using Node.js `net.createServer().listen(0)`
3. Start HTTP server on `localhost:<port>`
4. Open browser to `<baseUrl>/cli-auth?port=<port>`
5. Print "Waiting for authentication..." with spinner
6. Server handles GET `/callback?key=<key>&email=<email>`:
   - Save to config file
   - Respond with HTML: "✓ Authentication complete. You can close this tab."
   - Print "✓ Logged in as <email>" to terminal
   - Shut down server, exit with code 0
7. Timeout after 120 seconds — print error, exit with code 1

### Build

- TypeScript compiled with `tsc` to `dist/`
- Standalone package (not in pnpm workspace) — simpler for npm publish
- `#!/usr/bin/env node` shebang in entry point

## Web Endpoints

### `/cli-auth` Page

Location: `src/app/cli-auth/page.tsx`

Server component:
1. Read `port` from search params, validate it's a number
2. Check session via `auth()`
3. If not logged in → redirect to `/api/auth/signin?callbackUrl=/cli-auth?port=<port>`
4. If logged in → render approval page

Approval page UI:
- Fooshop logo
- "Fooshop CLI wants to access your account"
- Shows user email and name
- **Form submission** (not fetch/AJAX) — `<form method="POST" action="/api/auth/cli-callback">` with hidden `port` and `nonce` fields
- "Approve" button submits the form — browser follows the 302 redirect natively
- "Deny" button → redirect to localhost with `?error=denied`

**CSRF protection:** Server component generates a one-time `nonce` (random UUID), stores it in a short-lived cookie (60s, httpOnly, sameSite=strict). The `/api/auth/cli-callback` endpoint validates that the nonce in the form body matches the cookie, then deletes the cookie.

### `/api/auth/cli-callback` Endpoint

Location: `src/app/api/auth/cli-callback/route.ts`

POST handler (receives form data, not JSON):
1. Verify session via `auth()` — 401 if not authenticated
2. Validate CSRF nonce: compare form body `nonce` with `cli-auth-nonce` cookie — 403 if mismatch, then delete cookie
3. Read `port` from form body, validate as integer in range 1024-65535
4. Look up creator by `session.user.id`:
   - If exists: use existing creator
   - If not: create new creator record with `email`, `name` from session, slug derived from email prefix + random suffix (e.g., `emanuele-a3f7`) to satisfy NOT NULL unique constraint
5. Check for existing CLI API key for this creator (name: "Fooshop CLI"):
   - If exists: revoke old key (delete from DB), generate new one
   - This prevents key accumulation from repeated `fooshop login`
6. Generate API key via `generateApiKey()` from `src/lib/api-key.ts`
7. Insert into `apiKeys` table:
   - `creatorId`: creator's ID
   - `name`: "Fooshop CLI"
   - `scopes`: all `CREATOR_SCOPES`
   - `expiresAt`: null (no expiry)
8. Redirect (302) to `http://localhost:<port>/callback?key=<plaintext_key>&email=<email>`

## Security

- **Port validation:** Integer, range 1024-65535
- **Localhost only:** CLI server binds to `127.0.0.1`, not `0.0.0.0`
- **Session-gated:** API key generation requires active session cookie
- **CSRF nonce:** One-time nonce in form + httpOnly cookie prevents cross-site request forgery
- **Form submission:** Uses native form POST (not fetch) so browser follows 302 redirect to localhost
- **Key rotation:** Repeated logins revoke previous CLI key
- **Key in URL:** Appears only in localhost redirect — same pattern as GitHub CLI, Stripe CLI, Vercel CLI. Key never stored in browser, only in terminal config file.
- **No PKCE needed:** The API key is generated server-side and passed to localhost. No client secret exchange. If needed in future, can add PKCE.

## Testing

- **CLI unit tests:** config read/write, port finding, callback parsing
- **Integration test:** mock the full login flow with a fake server
- **Web endpoint tests:** `/api/auth/cli-callback` with valid/invalid session, creator auto-creation
- **Manual test:** `npx fooshop login` against staging

## Out of Scope

- Other CLI commands (`fooshop init`, `fooshop products`, etc.) — separate issues
- `fooshop logout` and `fooshop whoami` — will be added as follow-up commands
- API key scoping per command — all CREATOR_SCOPES for now
- PKCE or code exchange — unnecessary for localhost redirect pattern
- Windows support — macOS and Linux only per acceptance criteria
- Config file is shared with admin CLI (`~/.fooshop/config.json`) — both use same `apiKey` field. Admin CLI will need a separate key field if admin-scoped keys are needed in the future
