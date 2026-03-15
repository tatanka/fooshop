# Badge "Powered by Fooshop" su Store Pubblici

**Issue:** #46 — [GEN-021]
**Date:** 2026-03-15
**Status:** Approved

## Problem

Every public store page is an organic acquisition channel. The current footer ("Powered by Fooshop") has `opacity: 0.4` and no link — it's effectively invisible and generates zero click-through. The launch strategy (DR-2026-03-08) identifies this badge as a Day 1 growth loop at zero cost.

## Solution

Two complementary elements on every public page (store page and product page):

1. **Floating badge** — a dark pill fixed to the bottom-right corner, always visible, linking to the landing page with UTM tracking
2. **Footer link upgrade** — the existing "Powered by Fooshop" text becomes a clickable link with slightly increased visibility

## Floating Badge

- **Style:** pill shape, dark background (`#1f2937`), white text, `border-radius: 999px`, subtle `box-shadow`
- **Content:** bolt icon + "Sell on **Fooshop** — it's free"
- **Position:** `fixed bottom-4 right-4 z-50` (Tailwind classes, consistent with codebase)
- **Link:** `/?ref=store-badge&store={slug}`, opens in new tab (`target="_blank"`, with `rel="noopener noreferrer"`)
- **Behavior:** always visible, not dismissible
- **Mobile:** same position, font scales down slightly (`12px` vs `13px` on desktop)
- **Accessibility:** proper link semantics (`<a>` not `<div>`), sufficient color contrast (white on `#1f2937` = 15.4:1 ratio)

## Footer Upgrade

### Store page (`[slug]/page.tsx`)

Current (line 309-316):
```tsx
<footer className="mt-16 text-center text-sm opacity-40">
  <p>Powered by Fooshop</p>
  <p className="mt-2">
    <a href="/legal/terms" ...>Terms</a>
    {" · "}
    <a href="/legal/privacy" ...>Privacy</a>
  </p>
</footer>
```

Change to:
- Opacity from `0.4` to `0.5`
- "Fooshop" becomes a link to `/?ref=store-footer&store={slug}`
- Text stays "Powered by Fooshop"

### Product page (`[slug]/[productSlug]/page.tsx`)

Current (line 137-150):
```tsx
<footer className="mt-16 text-sm opacity-40">
  <p>Sold by <a href="/{slug}">{storeName}</a> on Fooshop</p>
  ...
</footer>
```

Change to:
- Opacity from `0.4` to `0.5`
- "Fooshop" becomes a link to `/?ref=product-footer&store={slug}`

## Component Design

A single client component `<FooshopBadge />`:

```
src/components/fooshop-badge.tsx
```

**Props:**
- `slug: string` — creator's store slug, used in UTM params

**Renders:**
- The floating pill badge (fixed position)
- No footer modification — footer changes are inline edits to existing pages

**Why client component:** Uses `position: fixed` which works fine in SSR, but keeping it as a client component allows future enhancements (hover animations, dismiss logic) without refactoring.

**Styling:** Use Tailwind classes (consistent with the rest of the codebase), not inline styles. The badge uses `z-50` (`z-index: 50`) — high enough to sit above store content but below modals/dialogs.

## UTM Tracking Schema

| Source | `ref` param | `store` param |
|--------|-------------|---------------|
| Floating badge on store page | `store-badge` | `{slug}` |
| Floating badge on product page | `store-badge` | `{slug}` |
| Footer link on store page | `store-footer` | `{slug}` |
| Footer link on product page | `product-footer` | `{slug}` |

These params are passive — the landing page can read them for analytics. No backend changes needed now. The existing `ReferralTracker` component or future analytics can pick them up.

## Files to Change

| File | Change |
|------|--------|
| `src/components/fooshop-badge.tsx` | **New** — floating badge component |
| `src/app/[slug]/page.tsx` | Import `FooshopBadge`, add before `</main>`. Update footer opacity + link |
| `src/app/[slug]/[productSlug]/page.tsx` | Import `FooshopBadge`, add before `</main>`. Update footer opacity + link |

## Out of Scope

- Dismiss/close functionality (can add later if creator feedback requires it)
- Theme-aware badge colors (dark pill works on all backgrounds)
- Analytics dashboard for badge clicks (just UTM params for now)
- A/B testing different CTA copy
