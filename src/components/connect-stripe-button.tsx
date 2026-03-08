"use client";

import { useState } from "react";

export function ConnectStripeButton() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="border px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {loading ? "Connecting..." : "Connect Stripe"}
    </button>
  );
}
