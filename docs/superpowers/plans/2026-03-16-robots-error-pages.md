# robots.txt & Custom Error Pages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add robots.txt and branded 404/500 error pages to fooshop.ai

**Architecture:** Four independent static files — robots.txt, not-found.tsx (with Navbar/Footer), error.tsx (standalone), global-error.tsx (fully self-contained with inline fonts/CSS). No shared state or dependencies between tasks.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS 4, Playfair Display + DM Sans fonts

**Spec:** `docs/superpowers/specs/2026-03-16-robots-error-pages-design.md`

---

### Task 1: robots.txt

**Files:**
- Create: `public/robots.txt`

- [ ] **Step 1: Create robots.txt**

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /onboarding
Disallow: /api
Disallow: /checkout
Sitemap: https://fooshop.ai/sitemap.xml
```

- [ ] **Step 2: Verify file is served**

Run: `pnpm dev` and visit `http://localhost:3000/robots.txt`
Expected: File contents displayed as plain text

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "feat: add robots.txt with sitemap reference and disallow rules (#48)"
```

---

### Task 2: 404 Page (not-found.tsx)

**Files:**
- Create: `src/app/not-found.tsx`

**Reference files:**
- `src/components/navbar.tsx` — async server component, imports `auth`, `signIn`, `signOut`
- `src/components/footer.tsx` — simple component with links
- `src/app/(platform)/page.tsx` — reference for button styles and layout patterns
- `src/app/globals.css` — CSS variables and `animate-fade-up` class

- [ ] **Step 1: Create not-found.tsx**

```tsx
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found — Fooshop",
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-24 text-center animate-fade-up">
        <h1 className="text-8xl font-bold text-muted/40">404</h1>
        <h2 className="mt-4 text-2xl font-bold">This page doesn&apos;t exist</h2>
        <p className="mt-3 text-muted">
          The page you&apos;re looking for may have been moved or no longer
          exists.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/explore"
            className="bg-accent text-white px-8 py-4 rounded-full font-semibold hover:opacity-85 transition-opacity"
          >
            Explore Products
          </Link>
          <Link
            href="/"
            className="border border-border text-ink px-8 py-4 rounded-full font-semibold hover:border-ink transition-colors"
          >
            Go Home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
```

Key details:
- Server component (no `"use client"`) — Navbar is async (calls `auth()`)
- Uses `text-8xl` for the "404" to make it large and muted (`text-muted/40` for 40% opacity)
- Button styles match home page CTA pattern: `rounded-full`, `px-8 py-4`
- `animate-fade-up` from globals.css for entrance animation
- `&apos;` for apostrophes in JSX

- [ ] **Step 2: Verify in browser**

Run: `pnpm dev` and visit `http://localhost:3000/some-nonexistent-page`
Expected: Branded 404 page with Navbar, Footer, "404" heading, two buttons

- [ ] **Step 3: Commit**

```bash
git add src/app/not-found.tsx
git commit -m "feat: add branded 404 page with navigation links (#48)"
```

---

### Task 3: Error Page (error.tsx)

**Files:**
- Create: `src/app/error.tsx`

**Reference files:**
- `src/app/globals.css` — CSS variables available (renders inside root layout)
- `src/app/layout.tsx` — confirms fonts loaded as CSS variables `--font-display`, `--font-body`

- [ ] **Step 1: Create error.tsx**

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center animate-fade-up">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-muted">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <button
            onClick={reset}
            className="bg-accent text-white px-8 py-4 rounded-full font-semibold hover:opacity-85 transition-opacity"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="border border-border text-ink px-8 py-4 rounded-full font-semibold hover:border-ink transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
```

Key details:
- `"use client"` — required by Next.js for error boundaries
- `useEffect` logs error to console for dev debugging
- `reset()` retries the failed render
- `min-h-[60vh]` centers content vertically within the layout
- No Navbar/Footer — standalone to avoid cascading failures
- Fonts and CSS variables available from root layout

- [ ] **Step 2: Commit**

```bash
git add src/app/error.tsx
git commit -m "feat: add error boundary page with retry (#48)"
```

---

### Task 4: Global Error Page (global-error.tsx)

**Files:**
- Create: `src/app/global-error.tsx`

**Reference files:**
- `src/app/layout.tsx` — this is what global-error replaces; must provide own `<html>` + `<body>`
- `src/app/globals.css` — CSS variable values to inline: `--ink: #1a1a1a`, `--paper: #faf9f7`, `--accent: #e85d04`, `--muted: #6b6b6b`, `--border: #e5e2dd`, `--surface: #ffffff`

- [ ] **Step 1: Create global-error.tsx**

```tsx
"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --ink: #1a1a1a;
                --paper: #faf9f7;
                --accent: #e85d04;
                --muted: #6b6b6b;
                --border: #e5e2dd;
                --surface: #ffffff;
              }
              body {
                margin: 0;
                background: var(--paper);
                color: var(--ink);
                font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
              }
              h1 {
                font-family: 'Playfair Display', ui-serif, Georgia, serif;
              }
            `,
          }}
        />
      </head>
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 700, margin: 0 }}>
              Something went wrong
            </h1>
            <p style={{ marginTop: "0.75rem", color: "var(--muted)" }}>
              An unexpected error occurred. Please try again.
            </p>
            <div
              style={{
                marginTop: "2.5rem",
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
              }}
            >
              <button
                onClick={reset}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  padding: "0.75rem 2rem",
                  borderRadius: "9999px",
                  border: "none",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                  padding: "0.75rem 2rem",
                  borderRadius: "9999px",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  fontSize: "1rem",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                Go Home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
```

Key details:
- `"use client"` — required by Next.js
- Own `<html>` and `<body>` — replaces root layout entirely
- Google Fonts via `<link>` tag — cannot use `next/font`
- CSS variables defined in inline `<style>` — cannot rely on globals.css
- All layout via inline styles — Tailwind not available without globals.css
- Uses `<a href="/">` instead of `<Link>` — no Next.js router available in this context
- No animation — keyframes not available without globals.css

- [ ] **Step 2: Commit**

```bash
git add src/app/global-error.tsx
git commit -m "feat: add self-contained global error page (#48)"
```

---

### Task 5: Build Verification

- [ ] **Step 1: Run production build**

Run: `pnpm build`
Expected: Build succeeds with no errors. All 4 new files compiled.

- [ ] **Step 2: Final commit (if any lint/build fixes needed)**

Only if build reveals issues that need fixing.
