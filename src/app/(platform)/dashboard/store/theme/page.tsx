"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await fetch("/api/store");
        if (!res.ok) throw new Error("Failed to load store");
        const data = await res.json();
        setTheme({ ...DEFAULT_THEME, ...data.storeTheme });
        setSlug(data.slug);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load store");
      } finally {
        setFetching(false);
      }
    }
    fetchStore();
  }, []);

  async function handleGenerate() {
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
      setTheme(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate theme");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save theme");
      setSaving(false);
    }
  }

  function updateTheme<K extends keyof StoreTheme>(key: K, value: StoreTheme[K]) {
    setTheme((prev) => ({ ...prev, [key]: value }));
  }

  if (fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading theme editor...</p>
      </div>
    );
  }

  const previewUrl = slug
    ? `/${slug}?themePreview=${btoa(JSON.stringify(theme))}`
    : "";

  return (
    <div className="flex min-h-screen">
      <div className="w-[40%] border-r overflow-y-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Theme Editor</h1>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* AI Regeneration */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">AI Theme Generation</h2>
          <textarea
            className="w-full rounded-md border border-gray-300 p-3 text-sm"
            rows={3}
            placeholder="Describe the look you want..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
          />
          <button
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            onClick={handleGenerate}
            disabled={generating || !aiPrompt.trim()}
          >
            {generating ? "Generating..." : "Regenerate Theme"}
          </button>
        </section>

        {/* Color Pickers */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Colors</h2>
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={theme[key]}
                onChange={(e) => updateTheme(key, e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-gray-300"
              />
              <label className="text-sm font-medium">{label}</label>
              <span className="ml-auto text-xs text-gray-500">
                {theme[key]}
              </span>
            </div>
          ))}
        </section>

        {/* Dropdowns */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Typography & Layout</h2>

          <div className="space-y-1">
            <label className="text-sm font-medium">Font Family</label>
            <select
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
              value={theme.fontFamily}
              onChange={(e) =>
                updateTheme(
                  "fontFamily",
                  e.target.value as StoreTheme["fontFamily"]
                )
              }
            >
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Hero Style</label>
            <select
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
              value={theme.heroStyle}
              onChange={(e) =>
                updateTheme(
                  "heroStyle",
                  e.target.value as StoreTheme["heroStyle"]
                )
              }
            >
              <option value="gradient">Gradient</option>
              <option value="solid">Solid</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Layout</label>
            <select
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
              value={theme.layout}
              onChange={(e) =>
                updateTheme(
                  "layout",
                  e.target.value as StoreTheme["layout"]
                )
              }
            >
              <option value="grid">Grid</option>
              <option value="featured">Featured</option>
              <option value="list">List</option>
            </select>
          </div>
        </section>

        {/* Save / Cancel */}
        <div className="flex gap-3 pt-4">
          <button
            className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Theme"}
          </button>
          <a
            href="/dashboard/store"
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </a>
        </div>
      </div>

      <div className="w-[60%] bg-gray-100">
        {previewUrl && (
          <iframe
            key={JSON.stringify(theme)}
            src={previewUrl}
            className="w-full h-full border-0"
            title="Store preview"
          />
        )}
      </div>
    </div>
  );
}
