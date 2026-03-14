"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NumericInput } from "@/components/ui/numeric-input";

export default function NewReferralPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [affiliateName, setAffiliateName] = useState("");
  const [affiliateEmail, setAffiliateEmail] = useState("");
  const [productId, setProductId] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");

  const [products, setProducts] = useState<{ id: string; title: string }[]>([]);

  // Generate a random code on mount
  useEffect(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let generated = "";
    for (let i = 0; i < 6; i++) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    setCode(generated);
  }, []);

  // Fetch creator's products for the optional product restriction
  useEffect(() => {
    fetch("/api/products?mine=true")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(
            data.map((p: { product: { id: string; title: string } }) => ({
              id: p.product.id,
              title: p.product.title,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const percent = parseInt(commissionPercent, 10);
      if (isNaN(percent) || percent < 1 || percent > 100) {
        throw new Error("Commission must be between 1 and 100");
      }

      const body: Record<string, unknown> = {
        code: code.toUpperCase().trim(),
        affiliateName: affiliateName.trim(),
        commissionPercent: percent,
      };

      if (affiliateEmail.trim()) body.affiliateEmail = affiliateEmail.trim();
      if (productId) body.productId = productId;

      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create referral");
      }

      router.push("/dashboard/referrals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold">New Referral</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Affiliate Name</label>
          <input
            type="text"
            value={affiliateName}
            onChange={(e) => setAffiliateName(e.target.value)}
            required
            placeholder="Mario Rossi"
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Affiliate Email (optional)</label>
          <input
            type="email"
            value={affiliateEmail}
            onChange={(e) => setAffiliateEmail(e.target.value)}
            placeholder="mario@example.com"
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            maxLength={20}
            className="w-full border border-border rounded-xl p-3 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-muted mt-1">Pre-generated. Edit to customize.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Product (optional)</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Commission (%)</label>
          <NumericInput
            value={commissionPercent}
            onChange={setCommissionPercent}
            placeholder="10"
            required
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-muted mt-1">Integer between 1 and 100.</p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white px-8 py-3 rounded-full font-semibold hover:opacity-85 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Referral"}
          </button>
          <a
            href="/dashboard/referrals"
            className="border px-8 py-3 rounded-full font-semibold hover:bg-paper/50 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}
