"use client";

import { useState } from "react";

export function ConnectStripeButton() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // fetch failed silently
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="bg-accent text-white px-6 py-3 rounded-full font-semibold hover:opacity-85 transition-opacity disabled:opacity-50"
    >
      {loading ? "Connecting..." : "Connect Stripe"}
    </button>
  );
}
