# Editorial Redesign — Design

**Date:** 2026-03-10

## Goal

Redesign all platform UI (everything except public store pages) with an editorial/magazine aesthetic. Distinctive typography, generous spacing, warm palette, subtle animations. Position Fooshop as a curated, premium marketplace.

## Scope

20 UI files (~1900 lines). Excludes `[slug]/page.tsx` (public store) and `[slug]/[productSlug]/page.tsx` (product detail — already themed).

## Design System

### Typography

- **Display**: Playfair Display (Google Fonts) — serif, bold, for h1/h2/hero/product titles
- **Body**: DM Sans (Google Fonts) — geometric sans, for text/buttons/labels/nav

### Palette

| Token | Value | Use |
|-------|-------|-----|
| `--ink` | `#1a1a1a` | Text, titles |
| `--paper` | `#faf9f7` | Page background (warm white) |
| `--accent` | `#e85d04` | CTA, links, highlights |
| `--muted` | `#6b6b6b` | Secondary text |
| `--border` | `#e5e2dd` | Borders, separators |
| `--surface` | `#ffffff` | Cards, inputs |

### Spacing & Layout

- Content max-width: `max-w-6xl` (landing/explore), `max-w-5xl` (dashboard)
- Section padding: `py-16` to `py-20`
- Cards: `border --border`, `rounded-xl`, light shadow on hover

### Animations (CSS only)

- `@keyframes fadeUp`: `opacity 0→1`, `translateY 16px→0`, 500ms ease-out
- Stagger via `animation-delay` on siblings
- Card hover: `translateY(-4px)` + `shadow-lg`, 200ms
- Button transitions: background-color 200ms

### Implementation

- CSS custom properties in `globals.css`
- Fonts via `next/font/google` in root layout
- No external animation libraries

## Navbar

- Logo: "fooshop." in Playfair Display italic bold. Period is part of brand.
- Nav links: DM Sans font-medium, animated underline on hover (accent color, expands from center)
- Logged in: avatar circle (initial) → dropdown (Dashboard, Sign Out)
- Not logged in: "Sign In" outline button
- Sticky: `sticky top-0 z-50`, `backdrop-blur-sm` with slight transparency
- No border-bottom — floats via whitespace
- Mobile: hamburger → fullscreen overlay with centered large links

## Landing Page (`/`)

### Hero
- `py-32`, no images — typography IS the design
- Title: Playfair Display ~56px, 2 lines
- Subtitle: DM Sans 18px, `--muted`, 1 line
- Two CTAs: primary (`--accent` bg, white text, `rounded-full`) + secondary (outline, accent text, arrow)
- Fade-up stagger animation

### "How it works"
- 3 columns: large editorial number (Playfair `text-5xl`, `--accent` opacity 30%) + title + description
- Fade-in stagger on scroll

### Final CTA block
- `rounded-2xl`, bg `--ink`, white text
- Playfair headline + accent CTA button
- Margin lateral (not full-bleed)
- Minimal footer below: "© 2026 Fooshop"

## Explore Page (`/explore`)

### Header
- Playfair 48px title + DM Sans muted subtitle

### Category filters
- Horizontal pill row, `rounded-full`
- Active: bg `--ink`, white text
- Inactive: transparent bg, border `--border`, `--muted` text
- Horizontal scroll on mobile

### Product grid — magazine layout
- First card: `col-span-1 row-span-2` (tall featured)
- Rest: regular 3-column grid
- Card: cover image (`aspect-4/3`, `object-cover`, `rounded-t-xl`), title (Playfair 18px), creator name (DM Sans 13px `--muted`), price (DM Sans 16px semibold)
- Hover: `translateY(-4px)` + shadow
- No description in card — clean
- Fade-up stagger

## Dashboard

### Hub (`/dashboard`)
- Title: Playfair 36px
- 3 stat cards: bg `--surface`, border, `rounded-xl`. Number in DM Sans `text-3xl` bold, label `--muted` small.
- Stripe CTA: single row, bg `accent/10`, border `--accent`, `rounded-xl`
- Orders table: minimal — no heavy header, small font, `--border` separators, row hover bg `--paper`
- Quick actions: outline buttons, "View Store →" as text link

### Products (`/dashboard/products`)
- Each row: thumbnail (40x40 `rounded-md`), title, price, status badge
- Badge: Published = bg `--ink` white text, Draft = bg `--border` `--muted` text
- Click row → edit
- "+ New Product" button: `rounded-full`, bg `--accent`, top right

### Product Form (new + edit)
- Section titles in Playfair
- Inputs: border `--border`, `rounded-lg`, focus ring `--accent`
- File drop zone: dashed border `--border`, bg `--paper`
- Price: $ prefix fixed left
- Buttons: Save/Create = bg `--accent` `rounded-full`, Cancel = outline

### Orders (`/dashboard/orders`)
- Full table: buyer, product, gross, net, status, date
- Column headers: `text-xs uppercase tracking-wider --muted`
- "Export CSV" outline button top right
- Status badges: completed (green light), refunded (red light), pending (yellow light)

### Store Settings + Theme Editor
- Store settings: updated input styles, same form structure
- Theme editor: split layout unchanged, updated control styles

## Onboarding (`/onboarding`)

- Centered, generous vertical space
- Title: Playfair 42px
- Subtitle: DM Sans `--muted`
- Large textarea, border `--border`, focus `--accent`
- CTA: `rounded-full`, bg `--accent`, large
- Result: card bg `--surface`, border, `rounded-xl` with store name (Playfair 24px), products list, tags (`rounded-full`, small)
- Fade-up stagger on generated results

## Checkout Success (`/checkout/success`)

- Centered, minimal
- Check icon: circle bg `--accent`, white icon (not emoji)
- Title: Playfair 36px
- Product + price: DM Sans `--muted`
- Download CTA: `rounded-full`, bg `--accent`, large
- Expiration note: text-sm `--muted`
- Back link: text `--muted`
- Page fade-in animation
