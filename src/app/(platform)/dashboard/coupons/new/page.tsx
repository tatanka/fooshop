"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NumericInput } from "@/components/ui/numeric-input";

export default function NewCouponPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [productId, setProductId] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

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
          setProducts(data.map((p: { product: { id: string; title: string } }) => ({
            id: p.product.id,
            title: p.product.title,
          })));
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const value = discountType === "percentage"
        ? parseInt(discountValue, 10)
        : Math.round(parseFloat(discountValue) * 100);

      if (isNaN(value) || value <= 0) {
        throw new Error("Invalid discount value");
      }

      const body: Record<string, unknown> = {
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: value,
      };

      if (productId) body.productId = productId;
      if (minAmount) body.minAmountCents = Math.round(parseFloat(minAmount) * 100);
      if (maxRedemptions) body.maxRedemptions = parseInt(maxRedemptions, 10);
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create coupon");
      }

      router.push("/dashboard/coupons");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold">New Coupon</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
          <label className="block text-sm font-medium mb-1">Discount Type</label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount ($)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {discountType === "percentage" ? "Discount (%)" : "Discount Amount (USD)"}
          </label>
          <NumericInput
            value={discountValue}
            onChange={setDiscountValue}
            allowDecimals={discountType === "fixed"}
            placeholder={discountType === "percentage" ? "20" : "5.00"}
            required
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
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
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Minimum Order Amount (optional, USD)</label>
          <NumericInput
            value={minAmount}
            onChange={setMinAmount}
            allowDecimals
            placeholder="0.00"
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Redemptions (optional)</label>
          <NumericInput
            value={maxRedemptions}
            onChange={setMaxRedemptions}
            placeholder="Unlimited"
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Expires At (optional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white px-8 py-3 rounded-full font-semibold hover:opacity-85 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Coupon"}
          </button>
          <a
            href="/dashboard/coupons"
            className="border px-8 py-3 rounded-full font-semibold hover:bg-paper/50 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}
