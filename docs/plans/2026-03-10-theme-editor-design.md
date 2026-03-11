# Dashboard Theme Editor — Design

**Date:** 2026-03-10

## Goal

Allow creators to customize their store theme from the dashboard via a hybrid approach: AI regeneration (prompt-based) + manual controls (color pickers, dropdowns). Split screen layout with live preview.

## Decisions

- **Hybrid editing**: AI prompt to regenerate + manual controls to tweak
- **Dedicated page**: `/dashboard/store/theme` (separate from name/description editor)
- **Split screen**: Form 40% left, iframe preview 60% right
- **AI regenerates only theme**: Name and description untouched
- **Apply immediately**: AI result populates controls instantly, no diff/confirm step
- **No external deps**: Native HTML inputs (color, select) + Tailwind

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/app/(platform)/dashboard/store/theme/page.tsx` | Split screen theme editor (client component) |
| `src/app/api/store/theme/route.ts` | PUT — save theme to DB |
| `src/app/api/store/theme/generate/route.ts` | POST — AI theme regeneration |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/ai.ts` | Add `generateTheme(prompt)` function |
| `src/app/[slug]/page.tsx` | Support `?themePreview=<base64>` query param |
| `src/app/(platform)/dashboard/store/page.tsx` | Add "Personalizza tema" link |

## Data Flow

```
GET /api/store → load current theme
  ↓
Theme editor state (local)
  ├─ Manual controls → update state → iframe preview updates (debounce 300ms)
  ├─ AI prompt → POST /api/store/theme/generate → populate state
  └─ Save → PUT /api/store/theme → persist to DB → redirect /dashboard
```

## UI Layout

```
┌─────────────────────────┬──────────────────────────────┐
│  FORM (40%)             │  PREVIEW (60%)               │
│                         │                              │
│  [Rigenera con AI]      │  iframe → /{slug}?theme=...  │
│  ┌───────────────────┐  │                              │
│  │ Descrivi il look  │  │                              │
│  │ che vuoi...       │  │                              │
│  └───────────────────┘  │                              │
│                         │                              │
│  Colori                 │                              │
│  ● Primary    [■ pick]  │                              │
│  ● Secondary  [■ pick]  │                              │
│  ● Background [■ pick]  │                              │
│  ● Text       [■ pick]  │                              │
│  ● Accent     [■ pick]  │                              │
│                         │                              │
│  Font: [sans ▾]         │                              │
│  Hero: [gradient ▾]     │                              │
│  Layout: [grid ▾]       │                              │
│                         │                              │
│  [Salva] [Annulla]      │                              │
└─────────────────────────┴──────────────────────────────┘
```

## API Endpoints

### `PUT /api/store/theme`

- **Auth**: Required (session user must be a creator)
- **Body**: `{ theme: StoreTheme }`
- **Validation**: All 8 fields present, hex colors valid, enum values for font/hero/layout
- **Action**: Updates only `creators.storeTheme`

### `POST /api/store/theme/generate`

- **Auth**: Required
- **Body**: `{ prompt: string }`
- **Response**: `{ theme: StoreTheme }`
- **Action**: Calls `generateTheme()`, returns result without persisting

## AI Function: `generateTheme()`

Separate from `generateStore()`. Focused prompt:
- Input: creator's description (e.g. "dark and minimal look")
- Output: only the 8 StoreTheme properties
- Model: claude-sonnet-4-6, max_tokens: 500

## Preview Mechanism

The public store page `[slug]/page.tsx` reads `?themePreview=<base64json>`:
- If present: decode JSON, merge with DEFAULT_THEME, use as theme
- If absent: normal behavior (theme from DB)
- Safe: theme values are only colors (CSS inline) and enum strings
