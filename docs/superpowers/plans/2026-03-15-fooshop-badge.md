# Fooshop Badge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating "Sell on Fooshop" badge and upgrade footer links on all public store/product pages to create a zero-cost growth loop.

**Architecture:** A single client component `<FooshopBadge />` renders a fixed-position pill badge. Footer changes are inline edits to the two existing page files. UTM params enable tracking without backend changes.

**Tech Stack:** Next.js App Router, React client component, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-15-fooshop-badge-design.md`

---

## Chunk 1: Badge Component + Page Integration

### File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/fooshop-badge.tsx` | **Create** | Floating pill badge (client component) |
| `src/app/[slug]/page.tsx` | **Modify** (lines 1, 309-316) | Add badge import + render, upgrade footer |
| `src/app/[slug]/[productSlug]/page.tsx` | **Modify** (lines 1, 137-150) | Add badge import + render, upgrade footer |

---

### Task 1: Create FooshopBadge component

**Files:**
- Create: `src/components/fooshop-badge.tsx`

- [ ] **Step 1: Create the component file**

```tsx
"use client";

export function FooshopBadge({ slug }: { slug: string }) {
  const href = `/?ref=store-badge&store=${encodeURIComponent(slug)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-gray-800 px-4 py-2 text-xs text-white shadow-lg transition-opacity hover:opacity-90 sm:text-[13px]"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      Sell on <strong className="font-semibold">Fooshop</strong> — it&apos;s free
    </a>
  );
}
```

Notes for the implementer:
- `bg-gray-800` is Tailwind's `#1f2937`, matching the spec exactly.
- `encodeURIComponent(slug)` prevents URL injection via the slug param.
- Mobile-first sizing: `text-xs` (12px) as base, `sm:text-[13px]` for desktop.

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build 2>&1 | tail -5`

Expected: build succeeds (component is not imported yet, but file should have no syntax errors that would break the build).

- [ ] **Step 3: Commit**

```bash
git add src/components/fooshop-badge.tsx
git commit -m "feat(badge): add FooshopBadge floating pill component (#46)"
```

---

### Task 2: Integrate badge + upgrade footer on store page

**Files:**
- Modify: `src/app/[slug]/page.tsx`

- [ ] **Step 1: Add import**

At the top of `src/app/[slug]/page.tsx`, after line 9 (`import { ReferralTracker }...`), add:

```tsx
import { FooshopBadge } from "@/components/fooshop-badge";
```

- [ ] **Step 2: Add FooshopBadge before closing `</main>`**

In the `StorePage` component's return, insert `<FooshopBadge slug={slug} />` just before the `<footer>` tag (before current line 309). The JSX should look like:

```tsx
        {storeProducts.length === 0 && (
          <p className="text-center opacity-50">No products yet.</p>
        )}

        <FooshopBadge slug={slug} />

        <footer className="mt-16 text-center text-sm opacity-50">
```

- [ ] **Step 3: Upgrade footer — change opacity and add link**

Replace the current footer block (lines 309-316):

```tsx
        <footer className="mt-16 text-center text-sm opacity-40">
          <p>Powered by Fooshop</p>
          <p className="mt-2">
            <a href="/legal/terms" className="underline hover:opacity-70">Terms</a>
            {" · "}
            <a href="/legal/privacy" className="underline hover:opacity-70">Privacy</a>
          </p>
        </footer>
```

With:

```tsx
        <footer className="mt-16 text-center text-sm opacity-50">
          <p>
            Powered by{" "}
            <a
              href={`/?ref=store-footer&store=${encodeURIComponent(slug)}`}
              className="underline hover:opacity-70"
              target="_blank"
              rel="noopener noreferrer"
            >
              Fooshop
            </a>
          </p>
          <p className="mt-2">
            <a href="/legal/terms" className="underline hover:opacity-70">Terms</a>
            {" · "}
            <a href="/legal/privacy" className="underline hover:opacity-70">Privacy</a>
          </p>
        </footer>
```

Changes:
- `opacity-40` → `opacity-50`
- "Fooshop" wrapped in `<a>` with UTM link (`ref=store-footer`)
- `target="_blank"` + `rel="noopener noreferrer"` on the Fooshop link

- [ ] **Step 4: Verify build**

Run: `pnpm build 2>&1 | tail -5`

Expected: build succeeds, store page route renders.

- [ ] **Step 5: Commit**

```bash
git add src/app/[slug]/page.tsx
git commit -m "feat(badge): add floating badge and upgrade footer on store page (#46)"
```

---

### Task 3: Integrate badge + upgrade footer on product page

**Files:**
- Modify: `src/app/[slug]/[productSlug]/page.tsx`

- [ ] **Step 1: Add import**

At the top of `src/app/[slug]/[productSlug]/page.tsx`, after line 10 (`import { ReferralTracker }...`), add:

```tsx
import { FooshopBadge } from "@/components/fooshop-badge";
```

- [ ] **Step 2: Add FooshopBadge before the footer**

Insert `<FooshopBadge slug={slug} />` just before the `<footer>` tag (before current line 137):

```tsx
        </div>

        <FooshopBadge slug={slug} />

        <footer className="mt-16 text-sm opacity-50">
```

- [ ] **Step 3: Upgrade footer — change opacity and add link**

Replace the current footer block (lines 137-150):

```tsx
        <footer className="mt-16 text-sm opacity-40">
          <p>
            Sold by{" "}
            <a href={`/${slug}`} className="underline">
              {creator.storeName}
            </a>{" "}
            on Fooshop
          </p>
          <p className="mt-2">
            <a href="/legal/terms" className="underline hover:opacity-70">Terms</a>
            {" · "}
            <a href="/legal/privacy" className="underline hover:opacity-70">Privacy</a>
          </p>
        </footer>
```

With:

```tsx
        <footer className="mt-16 text-sm opacity-50">
          <p>
            Sold by{" "}
            <a href={`/${slug}`} className="underline">
              {creator.storeName}
            </a>{" "}
            on{" "}
            <a
              href={`/?ref=product-footer&store=${encodeURIComponent(slug)}`}
              className="underline hover:opacity-70"
              target="_blank"
              rel="noopener noreferrer"
            >
              Fooshop
            </a>
          </p>
          <p className="mt-2">
            <a href="/legal/terms" className="underline hover:opacity-70">Terms</a>
            {" · "}
            <a href="/legal/privacy" className="underline hover:opacity-70">Privacy</a>
          </p>
        </footer>
```

Changes:
- `opacity-40` → `opacity-50`
- "Fooshop" wrapped in `<a>` with UTM link (`ref=product-footer`)
- `target="_blank"` + `rel="noopener noreferrer"` on the Fooshop link

- [ ] **Step 4: Verify build**

Run: `pnpm build 2>&1 | tail -5`

Expected: build succeeds, product page route renders.

- [ ] **Step 5: Commit**

```bash
git add src/app/[slug]/[productSlug]/page.tsx
git commit -m "feat(badge): add floating badge and upgrade footer on product page (#46)"
```

---

### Task 4: Final verification

- [ ] **Step 1: Full build**

Run: `pnpm build`

Expected: clean build, no errors, no warnings related to badge or footer changes.

- [ ] **Step 2: Visual check (if dev server available)**

Run: `pnpm dev` and visit:
- `http://localhost:3000/{any-store-slug}` — verify floating badge bottom-right, footer says "Powered by Fooshop" with link
- `http://localhost:3000/{any-store-slug}/{any-product-slug}` — verify floating badge, footer says "Sold by {store} on Fooshop" with link
- Check badge link opens in new tab with correct UTM params
- Check mobile viewport (Chrome DevTools) — badge visible, not overlapping content

- [ ] **Step 3: Done**

All 3 files changed, all commits made. Feature branch ready for merge.
