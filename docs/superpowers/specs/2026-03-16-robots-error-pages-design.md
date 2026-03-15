# robots.txt e pagine errore custom (404/500)

**Issue:** #48 [GEN-023]
**Date:** 2026-03-16
**Status:** Draft

## Overview

Add `robots.txt` for search engine crawlers and branded error pages (404, 500, global error) consistent with fooshop.ai design language.

## Design Decisions

- **404 page**: Full chrome (Navbar + Footer) via `(platform)/` layout — user is browsing, keep them oriented
- **error.tsx / global-error.tsx**: Standalone minimal pages — something broke, don't depend on more components that might also fail
- **global-error.tsx**: Fully self-contained with own `<html>`, inline fonts and CSS variables — last resort fallback

## Files

| File | Path | Chrome |
|------|------|--------|
| robots.txt | `public/robots.txt` | n/a |
| 404 | `src/app/(platform)/not-found.tsx` | Navbar + Footer |
| Error | `src/app/error.tsx` | Standalone |
| Global Error | `src/app/global-error.tsx` | Standalone, own `<html>` |

## 1. `public/robots.txt`

Static file allowing all crawlers, referencing the existing dynamic sitemap:

```
User-agent: *
Allow: /
Sitemap: https://fooshop.ai/sitemap.xml
```

## 2. `src/app/(platform)/not-found.tsx` — 404 Page

Server component inside `(platform)/` layout, inheriting Navbar and Footer.

**Content:**
- Large "404" heading in Playfair Display, muted color (`text-muted`)
- Subheading: "This page doesn't exist"
- Brief copy: "The page you're looking for may have been moved or no longer exists."
- Two pill buttons:
  - **Explore Products** → `/explore` (primary: `bg-accent text-white rounded-full`)
  - **Go Home** → `/` (secondary: `border border-border rounded-full hover:border-ink`)
- Uses `animate-fade-up` animation class from globals.css
- Centered layout: `max-w-2xl mx-auto text-center`, vertical padding `py-24`

**No data fetching** — pure static render.

## 3. `src/app/error.tsx` — Route Error Boundary

`"use client"` component (required by Next.js error boundaries).

Renders inside the root layout, so fonts and CSS variables from `globals.css` are available.

**Content:**
- Centered card on `bg-paper` background
- "Something went wrong" heading in Playfair Display
- Brief copy: "An unexpected error occurred. Please try again."
- **Try Again** button calling `reset()` (primary accent pill style)
- **Go Home** link to `/` (secondary style)
- Centered: `min-h-[60vh] flex items-center justify-center`

**Props:** `{ error: Error & { digest?: string }; reset: () => void }`

## 4. `src/app/global-error.tsx` — Root Layout Error Boundary

`"use client"` component that replaces the entire page including root layout.

Must render its own `<html>` and `<body>` tags. Cannot rely on layout.tsx for fonts or globals.css for CSS variables.

**Self-contained setup:**
- Google Fonts loaded via `<link>` tags in `<head>` (Playfair Display + DM Sans)
- Inline `<style>` block defining CSS variables: `--accent: #e85d04`, `--paper: #faf9f7`, `--ink: #1a1a1a`, `--muted: #6b6b6b`
- Body styled with inline CSS using these variables

**Content:**
- Same visual as `error.tsx`: centered "Something went wrong" + Try Again + Go Home
- Minimal — no external component dependencies

**Props:** `{ error: Error & { digest?: string }; reset: () => void }`

## Visual Consistency

All error pages follow fooshop design language:
- **Typography**: Playfair Display for headings, DM Sans for body
- **Colors**: Orange accent (`#e85d04`), warm paper background (`#faf9f7`), ink text (`#1a1a1a`)
- **Buttons**: Rounded-full pill style, consistent with home page CTAs
- **Animation**: `animate-fade-up` where globals.css is available

## Out of Scope

- Custom favicon/branding assets
- Per-route error pages (e.g., dashboard-specific errors)
- Error logging/reporting (Sentry, etc.)
