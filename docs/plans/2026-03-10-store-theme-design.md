# Store Page AI Theme — Design

**Issue:** #5 [GEN-005] Store page: applicare theme generato da AI
**Date:** 2026-03-10

## Goal

The public store page applies colors, layout, and typography from the `store_theme` JSONB field generated during AI onboarding. Each store looks visually distinct.

## Theme Schema

Expand `store_theme` from `{ primaryColor, layout }` to:

```typescript
{
  primaryColor: string;      // #hex — buttons, CTAs
  secondaryColor: string;    // #hex — badges, tags
  backgroundColor: string;   // #hex — page background
  textColor: string;         // #hex — body text
  accentColor: string;       // #hex — links, hover, borders
  fontFamily: "sans" | "serif" | "mono";
  heroStyle: "gradient" | "solid" | "minimal";
  layout: "grid" | "featured" | "list";
}
```

## Technical Approach

### CSS Variables on Wrapper

Server component renders theme as inline `style` on a root `<div>`:

```tsx
<div style={{
  '--store-primary': theme.primaryColor,
  '--store-secondary': theme.secondaryColor,
  '--store-bg': theme.backgroundColor,
  '--store-text': theme.textColor,
  '--store-accent': theme.accentColor,
}}>
```

Tailwind arbitrary values reference the variables: `text-[var(--store-text)]`, `bg-[var(--store-primary)]`, etc.

### Font Family

Mapped to Tailwind classes: `font-sans`, `font-serif`, `font-mono`. Applied on the wrapper div.

### Fallback

If `storeTheme` is null (legacy creators), render current hardcoded design unchanged.

## Layouts

- **grid** — 3-column responsive grid (current behavior, themed)
- **featured** — Hero card for first product (large, full-width) + grid for remaining
- **list** — Single-column horizontal cards with product image left, details right

## Hero Styles

- **gradient** — Gradient from `primaryColor` to `secondaryColor` behind store name/description
- **solid** — Solid `primaryColor` background for header area
- **minimal** — No background color, large typography with `primaryColor` accents

## AI Prompt Update

Update the Claude prompt in `lib/ai.ts` to generate the full theme object. The prompt describes the creator's niche and asks for a cohesive color palette, appropriate font, layout, and hero style.

## Files to Change

| File | Change |
|------|--------|
| `src/db/schema.ts` | Expand `StoreTheme` type |
| `src/lib/ai.ts` | Update prompt to generate full theme |
| `src/app/[slug]/page.tsx` | Apply theme via CSS vars, implement 3 layouts + hero styles |
