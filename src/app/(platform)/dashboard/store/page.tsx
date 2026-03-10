"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditStorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");

  useEffect(() => {
    fetch("/api/store")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setStoreName(data.storeName ?? "");
        setStoreDescription(data.storeDescription ?? "");
      })
      .catch(() => setError("Failed to load store info"))
      .finally(() => setFetching(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, storeDescription }),
      });
      if (!res.ok) throw new Error("Failed to update store");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16">
        <p className="text-muted">Loading...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold">Edit Store</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Store Name</label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={storeDescription}
            onChange={(e) => setStoreDescription(e.target.value)}
            rows={4}
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white px-8 py-3 rounded-full font-semibold hover:opacity-85 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <a
            href="/dashboard"
            className="border px-8 py-3 rounded-full font-semibold hover:bg-paper/50 transition-colors"
          >
            Cancel
          </a>
        </div>

        <a
          href="/dashboard/store/theme"
          className="mt-4 inline-block text-sm text-muted hover:text-ink underline transition-colors"
        >
          Customize theme
        </a>
      </form>
    </main>
  );
}
