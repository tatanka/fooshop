"use client";

import { useState } from "react";

interface BuyButtonProps {
  productId: string;
  hasStripe: boolean;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function BuyButton({ productId, hasStripe }: BuyButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (hasStripe) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? GENERIC_ERROR);
          return;
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setError(GENERIC_ERROR);
      } catch {
        setError("Connection failed. Please check your internet and try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // No Stripe — show modal and track buy intent
    setShowModal(true);
    fetch("/api/buy-intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    }).catch(() => {});
  }

  return (
    <>
      <div>
        <button
          onClick={handleClick}
          disabled={loading}
          className="bg-black text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Buy Now"}
        </button>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
            <h2 className="text-xl font-bold">
              Questo prodotto sarà disponibile a breve
            </h2>
            <p className="mt-3 text-gray-600">
              Il creator è stato avvisato!
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="mt-6 bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
