"use client";

import { useState } from "react";

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
  theme: {
    primaryColor: string;
    layout: string;
  };
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
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold">Your store is ready!</h1>
        <div className="mt-8 border rounded-lg p-6">
          <h2 className="text-2xl font-semibold">{result.storeName}</h2>
          <p className="mt-2 text-gray-600">{result.storeDescription}</p>
          <div className="mt-6">
            <h3 className="font-semibold text-lg">Suggested products:</h3>
            <ul className="mt-3 space-y-3">
              {result.suggestedProducts.map((product, i) => (
                <li key={i} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{product.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
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
                        className="text-xs bg-gray-100 px-2 py-1 rounded"
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
        <div className="mt-8 flex gap-4">
          <a
            href="/dashboard"
            className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Go to Dashboard
          </a>
          <button
            onClick={() => setResult(null)}
            className="border px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">Set up your store</h1>
      <p className="mt-4 text-gray-600">
        Describe what you sell and AI will create your storefront in seconds.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="I sell Notion templates for project management and productivity. My audience is freelancers and small teams..."
        className="mt-8 w-full h-40 border rounded-lg p-4 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-black"
      />
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
      <button
        onClick={handleGenerate}
        disabled={loading || !description.trim()}
        className="mt-4 bg-black text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Generating..." : "Generate my store"}
      </button>
    </main>
  );
}
