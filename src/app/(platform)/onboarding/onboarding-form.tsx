"use client";

import { useState } from "react";
import type { StoreTheme } from "@/db/schema";

interface GeneratedStore {
  storeName: string;
  storeDescription: string;
  slug: string;
  suggestedProducts: {
    title: string;
    description: string;
    suggestedPriceCents: number;
    category: string;
    tags: string[];
  }[];
  theme: StoreTheme;
}

export default function OnboardingForm() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedStore | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/store/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error("Failed to generate store");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold animate-fade-up">
          Your store is ready.
        </h1>
        <div className="mt-8 bg-surface border border-border rounded-xl p-8 animate-fade-up stagger-2">
          <h2 className="text-2xl font-bold">{result.storeName}</h2>
          <p className="mt-2 text-muted">{result.storeDescription}</p>
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Suggested products
            </h3>
            <ul className="mt-3 space-y-3">
              {result.suggestedProducts.map((product, i) => (
                <li
                  key={i}
                  className={`border border-border rounded-xl p-4 animate-fade-up stagger-${Math.min(i + 3, 6)}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{product.title}</p>
                      <p className="text-sm text-muted mt-1">
                        {product.description}
                      </p>
                    </div>
                    <span className="text-lg font-bold whitespace-nowrap ml-4">
                      ${(product.suggestedPriceCents / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs border border-border px-2 py-0.5 rounded-full text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 flex gap-4 animate-fade-up stagger-5">
          <a
            href="/dashboard"
            className="bg-accent text-white px-6 py-3 rounded-full font-semibold hover:opacity-85 transition-opacity"
          >
            Go to Dashboard &rarr;
          </a>
          <button
            onClick={() => setResult(null)}
            className="border border-border px-6 py-3 rounded-full font-semibold hover:border-ink transition-colors"
          >
            Regenerate
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold animate-fade-up">
        Set up your store
      </h1>
      <p className="mt-4 text-lg text-muted animate-fade-up stagger-2">
        Describe what you sell and AI will create your storefront in seconds.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="I sell Notion templates for project management and productivity. My audience is freelancers and small teams..."
        className="mt-8 w-full h-40 border border-border rounded-xl p-4 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-accent bg-surface animate-fade-up stagger-3"
      />
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
      <button
        onClick={handleGenerate}
        disabled={loading || !description.trim()}
        className="mt-4 bg-accent text-white px-8 py-3 rounded-full text-lg font-semibold hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed animate-fade-up stagger-4"
      >
        {loading ? "Generating..." : "Generate my store →"}
      </button>
    </main>
  );
}
