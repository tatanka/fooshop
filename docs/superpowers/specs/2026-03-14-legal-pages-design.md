# Legal Pages: Terms of Service & Privacy Policy

**Issue:** #43 [GEN-018]
**Date:** 2026-03-14
**Status:** Approved

## Overview

Create publicly accessible Terms of Service and Privacy Policy pages for Fooshop. Required for Stripe Connect compliance and creator trust. Both pages available in English and Italian with a client-side language toggle.

## Architecture

```
src/
  app/(platform)/
    legal/
      terms/page.tsx        # Terms of Service (server component, exports metadata)
      privacy/page.tsx      # Privacy Policy (server component, exports metadata)
  components/
    footer.tsx              # Shared footer added to (platform)/layout.tsx
    legal-page.tsx          # Shared legal page layout (client component)
    language-toggle.tsx     # EN/IT pill toggle (client component)
  lib/
    legal-content.ts        # All legal text as structured objects (EN + IT)
```

## Content Approach

Legal content stored as structured TypeScript objects in `lib/legal-content.ts`, separate from presentation. Each document has EN and IT variants.

```typescript
type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type LegalDocument = {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
};

// Exports: termsContent, privacyContent
// Shape: { en: LegalDocument, it: LegalDocument }
```

## Footer Component

- Server component added to `(platform)/layout.tsx` after `{children}`
- Links: Terms of Service, Privacy Policy, Fooshop home
- Styling: `border-t border-border`, `py-8`, `text-sm text-muted`, `max-w-6xl mx-auto px-4`
- Responsive: links stack vertically on mobile, horizontal on desktop
- No animation

## Language Toggle

- Small pill toggle at top-right of content area: `[EN | IT]`
- Defaults to English
- Client-side state only (no URL change, no cookie)
- Single canonical URL per page for SEO
- Styled: `bg-surface border border-border rounded-full`, active state `bg-ink text-white`

## Legal Page Layout

- `max-w-3xl mx-auto px-4 py-16` for readable line width
- Title: `h1` Playfair Display, `text-4xl font-bold`
- Last updated: `text-muted text-sm` below title
- Sections: `h2` headings (`text-xl font-semibold mb-3`), paragraphs with `text-muted leading-relaxed`
- `animate-fade-up` on page load

## Terms of Service Sections

1. Acceptance of Terms
2. Platform Description (AI-powered digital marketplace)
3. Creator Accounts & Obligations
4. Buyer Rights & Digital Products
5. Pricing, Commissions & Payments (5% platform fee, Stripe Connect)
6. Intellectual Property & Content Ownership
7. Prohibited Content
8. Limitation of Liability
9. Termination
10. Governing Law
11. Changes to Terms
12. Contact

## Privacy Policy Sections

1. Introduction
2. Data We Collect (account data, payment via Stripe, analytics)
3. How We Use Your Data
4. Data Sharing (Stripe, Cloudflare R2, analytics)
5. Cookies & Tracking
6. Data Retention
7. Your Rights (GDPR: access, rectification, erasure, portability)
8. International Transfers
9. Data Security
10. Children's Privacy
11. Changes to This Policy
12. Contact (DPO/contact email)

## Additional Changes

- **Sitemap:** Add `/legal/terms` and `/legal/privacy` to `src/app/sitemap.ts`
- **Existing inline footers:** Remove from homepage; the shared footer replaces them

## Content Language

Both English and Italian, with client-side toggle defaulting to English. Content is drafted as functional legal text tailored to Fooshop's business model (to be lawyer-reviewed before launch).
