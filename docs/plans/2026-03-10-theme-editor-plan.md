# Dashboard Theme Editor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let creators customize their store theme from the dashboard via AI regeneration + manual controls, with a live split-screen preview.

**Architecture:** New page at `/dashboard/store/theme` with client-side form (40%) + iframe preview (60%). Two new API routes: PUT for saving theme, POST for AI generation. The public store page gains `?themePreview=` query param support for the iframe.

**Tech Stack:** Next.js App Router, Tailwind CSS, Anthropic SDK, native HTML inputs (color, select)

---

### Task 1: Add `generateTheme()` to `ai.ts`

**Files:**
- Modify: `src/lib/ai.ts`

**Step 1: Add the `generateTheme` function after `generateStore`**

```typescript
export async function generateTheme(prompt: string): Promise<StoreTheme> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are a brand designer. Based on the creator's description, generate a store theme.

Creator says: "${prompt}"

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "primaryColor": "#hex main brand color",
  "secondaryColor": "#hex secondary color",
  "backgroundColor": "#hex background color",
  "textColor": "#hex text color",
  "accentColor": "#hex accent color",
  "fontFamily": "sans | serif | mono",
  "heroStyle": "gradient | solid | minimal",
  "layout": "grid | featured | list"
}

Choose colors that form a cohesive palette. The backgroundColor should be a subtle tint (not pure white). The primaryColor and secondaryColor must be dark enough for white text overlay. Pick fontFamily, heroStyle, and layout that match the vibe described.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text) as StoreTheme;
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds (new function is exported but not yet used)

**Step 3: Commit**

```bash
git add src/lib/ai.ts
git commit -m "feat: add generateTheme() for AI theme-only regeneration"
```

---

### Task 2: Create `PUT /api/store/theme` endpoint

**Files:**
- Create: `src/app/api/store/theme/route.ts`

**Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators } from "@/db/schema";
import type { StoreTheme } from "@/db/schema";
import { eq } from "drizzle-orm";

const VALID_FONT_FAMILIES = ["sans", "serif", "mono"] as const;
const VALID_HERO_STYLES = ["gradient", "solid", "minimal"] as const;
const VALID_LAYOUTS = ["grid", "featured", "list"] as const;

function isValidHex(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

function validateTheme(theme: unknown): theme is StoreTheme {
  if (!theme || typeof theme !== "object") return false;
  const t = theme as Record<string, unknown>;
  return (
    isValidHex(t.primaryColor as string) &&
    isValidHex(t.secondaryColor as string) &&
    isValidHex(t.backgroundColor as string) &&
    isValidHex(t.textColor as string) &&
    isValidHex(t.accentColor as string) &&
    VALID_FONT_FAMILIES.includes(t.fontFamily as typeof VALID_FONT_FAMILIES[number]) &&
    VALID_HERO_STYLES.includes(t.heroStyle as typeof VALID_HERO_STYLES[number]) &&
    VALID_LAYOUTS.includes(t.layout as typeof VALID_LAYOUTS[number])
  );
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!validateTheme(body.theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const [updated] = await db
    .update(creators)
    .set({ storeTheme: body.theme })
    .where(eq(creators.userId, session.user.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json({ theme: updated.storeTheme });
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/store/theme/route.ts
git commit -m "feat: add PUT /api/store/theme endpoint with validation"
```

---

### Task 3: Create `POST /api/store/theme/generate` endpoint

**Files:**
- Create: `src/app/api/store/theme/generate/route.ts`

**Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateTheme } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const prompt = body.prompt?.trim();
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const theme = await generateTheme(prompt);
  return NextResponse.json({ theme });
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/store/theme/generate/route.ts
git commit -m "feat: add POST /api/store/theme/generate endpoint"
```

---

### Task 4: Add `?themePreview` support to public store page

**Files:**
- Modify: `src/app/[slug]/page.tsx`

**Step 1: Update Props interface and StorePage component**

The store page is a server component. Add `searchParams` to the props and read `themePreview` query param. If present, decode it from base64 and merge with DEFAULT_THEME (overriding DB theme).

Update the `Props` interface:

```typescript
interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ themePreview?: string }>;
}
```

Update `generateMetadata` signature to accept the new props shape (it already only uses `params`, no change needed in its body).

Update `StorePage` to read `searchParams`:

```typescript
export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { themePreview } = await searchParams;
  // ... existing creator/products fetch ...

  let theme: StoreTheme = { ...DEFAULT_THEME, ...creator.storeTheme };

  if (themePreview) {
    try {
      const previewTheme = JSON.parse(
        Buffer.from(themePreview, "base64").toString("utf-8")
      );
      theme = { ...DEFAULT_THEME, ...previewTheme };
    } catch {
      // Invalid preview param — ignore, use DB theme
    }
  }

  // ... rest of component unchanged ...
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/[slug]/page.tsx
git commit -m "feat: support ?themePreview query param on store page"
```

---

### Task 5: Create the theme editor page

**Files:**
- Create: `src/app/(platform)/dashboard/store/theme/page.tsx`

**Step 1: Create the theme editor client component**

This is the main UI — split screen with form on left, iframe preview on right.

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { StoreTheme } from "@/db/schema";

const DEFAULT_THEME: StoreTheme = {
  primaryColor: "#2563eb",
  secondaryColor: "#7c3aed",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  accentColor: "#3b82f6",
  fontFamily: "sans",
  heroStyle: "minimal",
  layout: "grid",
};

const COLOR_FIELDS = [
  { key: "primaryColor", label: "Primary" },
  { key: "secondaryColor", label: "Secondary" },
  { key: "backgroundColor", label: "Background" },
  { key: "textColor", label: "Text" },
  { key: "accentColor", label: "Accent" },
] as const;

export default function ThemeEditorPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<StoreTheme>(DEFAULT_THEME);
  const [slug, setSlug] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetch("/api/store")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setTheme({ ...DEFAULT_THEME, ...data.storeTheme });
        setSlug(data.slug);
      })
      .catch(() => setError("Failed to load store info"))
      .finally(() => setFetching(false));
  }, []);

  function updateTheme(key: keyof StoreTheme, value: string) {
    setTheme((prev) => ({ ...prev, [key]: value }));
  }

  function getPreviewUrl() {
    if (!slug) return "";
    const encoded = Buffer.from(JSON.stringify(theme)).toString("base64");
    return `/${slug}?themePreview=${encoded}`;
  }

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/store/theme/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (!res.ok) throw new Error("Failed to generate theme");
      const data = await res.json();
      setTheme({ ...DEFAULT_THEME, ...data.theme });
    } catch {
      setError("Failed to generate theme. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/store/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) throw new Error("Failed to save theme");
      router.push("/dashboard");
    } catch {
      setError("Failed to save theme. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (fetching) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Form — 40% */}
      <div className="w-[40%] border-r overflow-y-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Customize Theme</h1>

        {/* AI Regeneration */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Regenerate with AI
          </label>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe the look you want, e.g. 'dark and minimal with purple accents'"
            rows={3}
            className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !aiPrompt.trim()}
            className="w-full bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "Regenerate Theme"}
          </button>
        </div>

        <hr />

        {/* Color Pickers */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium">Colors</h2>
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={theme[key]}
                onChange={(e) => updateTheme(key, e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-sm flex-1">{label}</span>
              <span className="text-xs text-gray-400 font-mono">
                {theme[key]}
              </span>
            </div>
          ))}
        </div>

        <hr />

        {/* Dropdowns */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Font</label>
            <select
              value={theme.fontFamily}
              onChange={(e) => updateTheme("fontFamily", e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            >
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Hero Style
            </label>
            <select
              value={theme.heroStyle}
              onChange={(e) => updateTheme("heroStyle", e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            >
              <option value="gradient">Gradient</option>
              <option value="solid">Solid</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Layout</label>
            <select
              value={theme.layout}
              onChange={(e) => updateTheme("layout", e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            >
              <option value="grid">Grid</option>
              <option value="featured">Featured</option>
              <option value="list">List</option>
            </select>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-black text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Theme"}
          </button>
          <a
            href="/dashboard/store"
            className="flex-1 text-center border px-4 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </a>
        </div>
      </div>

      {/* Preview — 60% */}
      <div className="w-[60%] bg-gray-100">
        {slug && (
          <iframe
            key={JSON.stringify(theme)}
            src={getPreviewUrl()}
            className="w-full h-full border-0"
            title="Store preview"
          />
        )}
      </div>
    </div>
  );
}
```

**Note:** Using `key={JSON.stringify(theme)}` on the iframe forces a reload when theme changes. This is simple and effective — the server component re-renders with the new themePreview param. If performance becomes an issue, a debounced approach can replace the key prop later.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/\(platform\)/dashboard/store/theme/page.tsx
git commit -m "feat: add split-screen theme editor page"
```

---

### Task 6: Add "Customize theme" link to store editor page

**Files:**
- Modify: `src/app/(platform)/dashboard/store/page.tsx`

**Step 1: Add a link to the theme editor below the form**

After the existing `<div className="flex gap-4">` with Save/Cancel buttons, add:

```tsx
<a
  href="/dashboard/store/theme"
  className="mt-4 inline-block text-sm text-gray-500 hover:text-black underline transition-colors"
>
  Customize theme
</a>
```

Place it right after the closing `</div>` of the button group (after line 98 in current file).

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/\(platform\)/dashboard/store/page.tsx
git commit -m "feat: add 'Customize theme' link to store editor"
```

---

### Task 7: Manual verification

**Step 1: Start dev server**

Run: `pnpm dev`

**Step 2: Test the full flow**

1. Log in as a creator
2. Go to `/dashboard/store` — verify "Customize theme" link appears
3. Click it — verify split screen loads with current theme values
4. Change a color picker — verify iframe preview updates
5. Change font/hero/layout dropdowns — verify preview updates
6. Type an AI prompt and click "Regenerate Theme" — verify controls populate with new values and preview updates
7. Click "Save Theme" — verify redirect to dashboard
8. Visit the public store page — verify saved theme is applied

**Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: theme editor adjustments from manual testing"
```
